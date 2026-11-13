package br.com.tripsol.sol;

import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;

// Localização (GPS) do celular: saber se está ligada e pedir para ligar.
// A permissão do app não basta: com a localização do aparelho desligada nada funciona.
// "ligar" mostra o aviso do próprio Android ("Para continuar, ative a localização do
// dispositivo"), com um toque só; se o aviso não puder aparecer, abre a tela de
// Localização dos ajustes. O app confere o resultado chamando "estado".
@CapacitorPlugin(name = "LocalizacaoSol")
public class LocalizacaoSolPlugin extends Plugin {
    private static final int PEDIDO_LIGAR = 4711;

    private boolean ligada() {
        try {
            LocationManager lm = (LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return lm.isLocationEnabled();
            return lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception e) {
            return false;
        }
    }

    private void responder(PluginCall call, String como) {
        JSObject r = new JSObject();
        r.put("ligada", ligada());
        r.put("como", como);
        call.resolve(r);
    }

    private boolean abrirTela() {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void estado(PluginCall call) {
        responder(call, "estado");
    }

    @PluginMethod
    public void ligar(final PluginCall call) {
        if (ligada()) { responder(call, "ja-ligada"); return; }
        try {
            LocationRequest pedido = LocationRequest.create().setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
            LocationSettingsRequest ajustes = new LocationSettingsRequest.Builder().addLocationRequest(pedido).setAlwaysShow(true).build();
            LocationServices.getSettingsClient(getActivity())
                .checkLocationSettings(ajustes)
                .addOnSuccessListener(resposta -> responder(call, "ja-ligada"))
                .addOnFailureListener(erro -> {
                    if (erro instanceof ResolvableApiException) {
                        try {
                            ((ResolvableApiException) erro).startResolutionForResult(getActivity(), PEDIDO_LIGAR);
                            responder(call, "aviso");
                            return;
                        } catch (Exception e) { /* cai para a tela de ajustes */ }
                    }
                    responder(call, abrirTela() ? "ajustes" : "falhou");
                });
        } catch (Exception e) {
            responder(call, abrirTela() ? "ajustes" : "falhou");
        }
    }

    @PluginMethod
    public void abrirAjustes(PluginCall call) {
        responder(call, abrirTela() ? "ajustes" : "falhou");
    }
}
