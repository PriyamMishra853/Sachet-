package com.unfilteredengineers.sachet.data

import android.content.ContentResolver
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext

// Reads the text in a screenshot of a message, on the phone (ML Kit). The
// picture is never uploaded; only the text found in it is checked, like a
// pasted message.

// A phone screenshot (1080 × 2400) stays full size; a large camera photo is
// halved until it fits, so it can't run the app out of memory.
private const val MAX_SIDE = 3000

class ScreenshotReader(context: Context) {
    private val resolver = context.contentResolver
    private val ownPackage = context.packageName
    private val recognizer by lazy {
        TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())
    }

    /** The message text in the picture, or "" when there is none. */
    suspend fun read(uri: Uri): String {
        require(isReadable(uri)) { "Not a shared picture" }
        val bitmap = withContext(Dispatchers.IO) { decodeScaled(uri) } ?: return ""
        try {
            val text = recognizer.process(InputImage.fromBitmap(bitmap, 0)).await()
            return cleanScreenshotText(text.textBlocks.flatMap { block -> block.lines.map { it.text } })
        } finally {
            bitmap.recycle()
        }
    }

    fun close() = recognizer.close()

    // Another app chooses this address. Only content:// from another app: a
    // file:// address could point at Sachet's own private files.
    private fun isReadable(uri: Uri): Boolean =
        uri.scheme == ContentResolver.SCHEME_CONTENT && uri.authority?.startsWith(ownPackage) != true

    private fun decodeScaled(uri: Uri): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) } ?: return null
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / sample > MAX_SIDE) sample *= 2
        val options = BitmapFactory.Options().apply { inSampleSize = sample }
        return resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
    }
}

private suspend fun <T> Task<T>.await(): T = suspendCancellableCoroutine { cont ->
    addOnSuccessListener { cont.resume(it) }
    addOnFailureListener { cont.resumeWithException(it) }
    addOnCanceledListener { cont.cancel() }
}
