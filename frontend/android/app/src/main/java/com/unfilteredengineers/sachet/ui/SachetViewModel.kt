package com.unfilteredengineers.sachet.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.unfilteredengineers.sachet.BuildConfig
import com.unfilteredengineers.sachet.data.ApiException
import com.unfilteredengineers.sachet.data.CheckResult
import com.unfilteredengineers.sachet.data.IdType
import com.unfilteredengineers.sachet.data.IdentifierInput
import com.unfilteredengineers.sachet.data.MAX_MESSAGE_LENGTH
import com.unfilteredengineers.sachet.data.Prefs
import com.unfilteredengineers.sachet.data.ReportRequest
import com.unfilteredengineers.sachet.data.SachetApi
import com.unfilteredengineers.sachet.data.Stats
import com.unfilteredengineers.sachet.data.guessType
import com.unfilteredengineers.sachet.i18n.Lang
import com.unfilteredengineers.sachet.i18n.T
import com.unfilteredengineers.sachet.i18n.Text2
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class Screen { CHECK, REPORT, PRIVACY }
enum class Tab { MESSAGE, PHONE, UPI, URL }
enum class SendState { IDLE, SENDING, DONE, DUPLICATE, ERROR }

/** What was checked, so "Report" reports exactly that. */
sealed interface Checked {
    data class Message(val text: String, val sender: String? = null) : Checked
    data class Id(val type: IdType, val value: String) : Checked
}

data class CheckUi(
    val tab: Tab = Tab.MESSAGE,
    val input: String = "",
    /** Optional SMS sender, for the Message tab. */
    val sender: String = "",
    val loading: Boolean = false,
    val error: Text2? = null,
    val result: CheckResult? = null,
    val checked: Checked? = null,
    val reportState: SendState = SendState.IDLE,
    /** Answer to "Have you already paid?": null until answered. */
    val paid: Boolean? = null,
    // One key per result: double taps and retries create one report.
    val reportKey: String = UUID.randomUUID().toString(),
)

data class ReportUi(
    val identifier: String = "",
    val scamType: String? = null,
    val text: String = "",
    val amount: String = "",
    val state: SendState = SendState.IDLE,
    val error: Text2? = null,
    // Same key for retries of this one form; a new key after success.
    val key: String = UUID.randomUUID().toString(),
)

data class UiState(
    val screen: Screen = Screen.CHECK,
    val lang: Lang = Lang.EN,
    val check: CheckUi = CheckUi(),
    val report: ReportUi = ReportUi(),
    val deleteMessage: Text2? = null,
    val deleting: Boolean = false,
    val stats: Stats? = null,
)

class SachetViewModel(app: Application) : AndroidViewModel(app) {
    private val prefs = Prefs(app)
    private val api = SachetApi(BuildConfig.API_URL, clientId = { prefs.clientId })

    private val _state = MutableStateFlow(UiState(lang = prefs.lang))
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        loadStats()
    }

    fun show(screen: Screen) = _state.update { it.copy(screen = screen) }

    /** Impact numbers for the home screen. Left out quietly when offline. */
    fun loadStats() {
        viewModelScope.launch {
            runCatching { api.stats() }.onSuccess { s -> _state.update { it.copy(stats = s) } }
        }
    }

    fun toggleLang() {
        val next = if (_state.value.lang == Lang.EN) Lang.HI else Lang.EN
        prefs.lang = next
        _state.update { it.copy(lang = next) }
    }

    // ---- Check ----

    fun setTab(tab: Tab) = _state.update { it.copy(check = it.check.copy(tab = tab, error = null)) }

    fun setInput(value: String) =
        _state.update { it.copy(check = it.check.copy(input = value.take(MAX_MESSAGE_LENGTH))) }

    fun setSender(value: String) =
        _state.update { it.copy(check = it.check.copy(sender = value.take(40))) }

    /** A message shared from another app: show it and check it straight away. */
    fun checkShared(text: String) {
        if (text.isBlank()) return
        _state.update { it.copy(screen = Screen.CHECK, check = CheckUi(tab = Tab.MESSAGE, input = text)) }
        runCheck()
    }

    fun runCheck() {
        val c = _state.value.check
        val value = c.input.trim()
        if (value.isEmpty() || c.loading) return
        val checked = when (c.tab) {
            Tab.MESSAGE -> Checked.Message(value, c.sender.trim().ifEmpty { null })
            Tab.PHONE -> Checked.Id(IdType.PHONE, value)
            Tab.UPI -> Checked.Id(IdType.UPI, value)
            Tab.URL -> Checked.Id(IdType.URL, value)
        }
        _state.update { it.copy(check = c.copy(loading = true, error = null, result = null)) }
        viewModelScope.launch {
            val outcome = runCatching {
                when (checked) {
                    is Checked.Message -> api.checkMessage(checked.text, checked.sender)
                    is Checked.Id -> api.checkIdentifier(checked.type, checked.value)
                }
            }
            _state.update { s ->
                s.copy(
                    check = s.check.copy(
                        loading = false,
                        result = outcome.getOrNull(),
                        checked = checked,
                        error = outcome.exceptionOrNull()?.let(::errorText),
                        reportState = SendState.IDLE,
                        reportKey = UUID.randomUUID().toString(),
                        paid = null,
                    ),
                )
            }
        }
    }

    fun reportChecked() {
        val c = _state.value.check
        val checked = c.checked ?: return
        if (c.reportState == SendState.SENDING) return
        _state.update { it.copy(check = it.check.copy(reportState = SendState.SENDING)) }
        viewModelScope.launch {
            // A message from an ordinary number: report that number too.
            val senderPhone = c.result?.sender?.takeIf { it.isPhoneNumber }
                ?.let { listOf(IdentifierInput(IdType.PHONE.wire, it.value)) }
            val body = when (checked) {
                is Checked.Message -> ReportRequest(text = checked.text, identifiers = senderPhone)
                is Checked.Id -> ReportRequest(identifiers = listOf(IdentifierInput(checked.type.wire, checked.value)))
            }.copy(scamType = c.result?.scamType)
            val next = runCatching { api.report(body, c.reportKey) }
                .fold({ if (it.duplicate) SendState.DUPLICATE else SendState.DONE }, { SendState.ERROR })
            _state.update { it.copy(check = it.check.copy(reportState = next)) }
        }
    }

    /** Counts "money protected" when someone stopped before paying. Shown at once; saving is best effort. */
    fun answerPaid(paid: Boolean) {
        val checkId = _state.value.check.result?.checkId ?: return
        _state.update { it.copy(check = it.check.copy(paid = paid)) }
        viewModelScope.launch { runCatching { api.answerPaid(checkId, paid) } }
    }

    // ---- Report form ----

    fun editReport(change: (ReportUi) -> ReportUi) =
        _state.update { it.copy(report = change(it.report).copy(error = null)) }

    fun sendReport() {
        val r = _state.value.report
        val id = r.identifier.trim()
        val text = r.text.trim()
        if ((id.isEmpty() && text.isEmpty()) || r.state == SendState.SENDING) return
        _state.update { it.copy(report = r.copy(state = SendState.SENDING, error = null)) }
        viewModelScope.launch {
            val body = ReportRequest(
                identifiers = if (id.isEmpty()) null else listOf(IdentifierInput(guessType(id).wire, id)),
                text = text.ifEmpty { null },
                scamType = r.scamType,
                amountInr = r.amount.toLongOrNull(),
            )
            runCatching { api.report(body, r.key) }
                .onSuccess { res ->
                    val done = if (res.duplicate) SendState.DUPLICATE else SendState.DONE
                    _state.update { it.copy(report = ReportUi(state = done)) }
                }
                .onFailure { err ->
                    _state.update { it.copy(report = it.report.copy(state = SendState.IDLE, error = errorText(err, showReason429 = true))) }
                }
        }
    }

    // ---- Privacy ----

    fun deleteMyData() {
        if (_state.value.deleting) return
        _state.update { it.copy(deleting = true, deleteMessage = null) }
        viewModelScope.launch {
            val message = runCatching { api.deleteMyData() }
                .fold({ T.deleted(it.reports, it.checks) }, { T.deleteFailed })
            _state.update { it.copy(deleting = false, deleteMessage = message) }
        }
    }

    // The API explains a bad input (400) in English; other failures get our own text.
    private fun errorText(err: Throwable, showReason429: Boolean = false): Text2 = when {
        err is ApiException && (err.status == 400 || (showReason429 && err.status == 429)) ->
            Text2(err.reason, err.reason)
        err is ApiException && err.status == 0 -> T.errorOffline
        else -> T.errorGeneric
    }
}
