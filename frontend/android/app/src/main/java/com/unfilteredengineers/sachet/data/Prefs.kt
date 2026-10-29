package com.unfilteredengineers.sachet.data

import android.content.Context
import com.unfilteredengineers.sachet.i18n.Lang
import java.util.Locale
import java.util.UUID

// The two things the app remembers, only on this phone (backups are off).
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("sachet", Context.MODE_PRIVATE)

    /** Random, made on first use. Not linked to the phone number or any account. */
    val clientId: String
        get() = sp.getString(KEY_CLIENT_ID, null)
            ?: UUID.randomUUID().toString().also { sp.edit().putString(KEY_CLIENT_ID, it).apply() }

    /** Hindi by default when the phone itself is in Hindi. */
    var lang: Lang
        get() = when (sp.getString(KEY_LANG, null)) {
            "hi" -> Lang.HI
            "en" -> Lang.EN
            else -> if (Locale.getDefault().language == "hi") Lang.HI else Lang.EN
        }
        set(value) = sp.edit().putString(KEY_LANG, value.code).apply()

    private companion object {
        const val KEY_CLIENT_ID = "client_id"
        const val KEY_LANG = "lang"
    }
}
