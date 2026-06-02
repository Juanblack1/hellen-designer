package br.com.hellendesigner.app;

import android.os.Bundle;
import android.util.Log;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "HellenDesignerUpdate";

    private AppUpdateManager appUpdateManager;
    private ActivityResultLauncher<IntentSenderRequest> updateLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        updateLauncher = registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            result -> {
                if (result.getResultCode() != RESULT_OK) {
                    Log.w(TAG, "Google Play in-app update flow was cancelled or failed.");
                }
            }
        );

        super.onCreate(savedInstanceState);

        appUpdateManager = AppUpdateManagerFactory.create(this);
        checkForImmediateUpdate();
    }

    @Override
    public void onResume() {
        super.onResume();
        resumeImmediateUpdateIfNeeded();
    }

    private void checkForImmediateUpdate() {
        if (appUpdateManager == null) {
            return;
        }

        appUpdateManager
            .getAppUpdateInfo()
            .addOnSuccessListener(
                appUpdateInfo -> {
                    if (
                        appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                            && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
                    ) {
                        startImmediateUpdate(appUpdateInfo);
                    }
                }
            )
            .addOnFailureListener(error -> Log.d(TAG, "Google Play in-app update check unavailable.", error));
    }

    private void resumeImmediateUpdateIfNeeded() {
        if (appUpdateManager == null) {
            return;
        }

        appUpdateManager
            .getAppUpdateInfo()
            .addOnSuccessListener(
                appUpdateInfo -> {
                    if (
                        appUpdateInfo.updateAvailability()
                            == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
                    ) {
                        startImmediateUpdate(appUpdateInfo);
                    }
                }
            )
            .addOnFailureListener(error -> Log.d(TAG, "Google Play in-app update resume unavailable.", error));
    }

    private void startImmediateUpdate(AppUpdateInfo appUpdateInfo) {
        try {
            appUpdateManager.startUpdateFlowForResult(
                appUpdateInfo,
                updateLauncher,
                AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()
            );
        } catch (RuntimeException error) {
            Log.w(TAG, "Could not start Google Play in-app update flow.", error);
        }
    }
}
