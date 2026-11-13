package br.com.tripsol.sol;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin próprio: liga a localização do celular (ver LocalizacaoSolPlugin)
        registerPlugin(LocalizacaoSolPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
