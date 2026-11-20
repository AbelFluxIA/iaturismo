package br.com.tripsol.sol;

import android.graphics.Color;
import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin próprio: liga a localização do celular (ver LocalizacaoSolPlugin)
        registerPlugin(LocalizacaoSolPlugin.class);
        super.onCreate(savedInstanceState);
        // Faixas do relógio e dos botões na cor de fundo do app, com ícones escuros
        // (no Android 15+ essas faixas são transparentes e mostram o fundo da janela)
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#FBF7F0"));
        WindowInsetsControllerCompat barras = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        barras.setAppearanceLightStatusBars(true);
        barras.setAppearanceLightNavigationBars(true);
    }
}
