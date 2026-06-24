package com.ashish.momentumagent;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.AlarmClock;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;

@CapacitorPlugin(name = "AlarmManager")
public class AlarmManagerPlugin extends Plugin {

    /**
     * Sets a visible alarm in the phone's Clock app.
     * JS call: Plugins.AlarmManager.setAlarm({ hour, minute, message, days })
     *
     * days = [1,2,3,4,5,6,7] means repeat Mon–Sun (0 = one-time, 1=Mon...7=Sun)
     */
    @PluginMethod
    public void setAlarm(PluginCall call) {
        int hour    = call.getInt("hour", 7);
        int minute  = call.getInt("minute", 0);
        String message = call.getString("message", "Momentum Agent");
        boolean vibrate = Boolean.TRUE.equals(call.getBoolean("vibrate", true));

        // ACTION_SET_ALARM opens or silently sets an alarm in the system Clock app
        Intent intent = new Intent(AlarmClock.ACTION_SET_ALARM);
        intent.putExtra(AlarmClock.EXTRA_HOUR, hour);
        intent.putExtra(AlarmClock.EXTRA_MINUTES, minute);
        intent.putExtra(AlarmClock.EXTRA_MESSAGE, message);
        intent.putExtra(AlarmClock.EXTRA_VIBRATE, vibrate);
        intent.putExtra(AlarmClock.EXTRA_SKIP_UI, true); // set silently, no UI popup

        // Days array for repeating — optional
        // e.g. [Calendar.MONDAY, Calendar.TUESDAY, ...]
        // If not passed, alarm fires once
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("hour", hour);
            result.put("minute", minute);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to set alarm: " + e.getMessage());
        }
    }

    /**
     * Dismisses/deletes a clock alarm by matching hour + minute.
     * JS call: Plugins.AlarmManager.dismissAlarm({ hour, minute })
     */
    @PluginMethod
    public void dismissAlarm(PluginCall call) {
        int hour   = call.getInt("hour", 7);
        int minute = call.getInt("minute", 0);

        Intent intent = new Intent(AlarmClock.ACTION_DISMISS_ALARM);
        intent.putExtra(AlarmClock.EXTRA_HOUR, hour);
        intent.putExtra(AlarmClock.EXTRA_MINUTES, minute);
        intent.putExtra(AlarmClock.EXTRA_SKIP_UI, true);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to dismiss alarm: " + e.getMessage());
        }
    }
}
