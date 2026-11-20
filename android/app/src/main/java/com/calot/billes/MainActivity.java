package com.calot.billes;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // la musique de l'intro peut démarrer sans attendre un premier toucher
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
