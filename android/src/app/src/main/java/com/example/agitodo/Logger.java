package com.example.agitodo;

import android.util.Log;

public class Logger {
    static boolean debug = false;

    public void info(String msg) {
        if (debug) {
            Log.i("Agitodo", msg);
        }
    }

    public void error(String msg) {
        if (debug) {
            Log.e("Agitodo", msg);
        }
    }
}
