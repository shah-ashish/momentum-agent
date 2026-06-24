package com.ashish.momentumagent;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register your custom plugin BEFORE super.onCreate
        registerPlugin(AlarmManagerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
