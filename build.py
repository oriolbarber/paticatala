#!/usr/bin/env python3
"""Reconstrueix el fitxer de desenvolupament i els DOS lliurables a partir de
l'HTML autònom desat al projecte.

   pati_vela_mobil.html  →  pati_vela_simulador_v6.html   (autònom, icones base64)
                         →  pwa/index.html + pati-vela-app-PWA.zip
"""
import os, re, sys, shutil, zipfile

V2 = sys.argv[1] if len(sys.argv) > 1 else 'base_v2.html'
TITOL = '<title>Simulador de Patí de Vela Català</title>'
# Punt d'inserció de la capçalera de cada lliurable. Abans era l'enllaç de
# Google Fonts; en incrustar les tipografies, el bloc que les porta.
ANCORA = '<style id="tipografies">'

HEAD_PWA = ('<link rel="manifest" href="manifest.json">\n'
            '<meta name="theme-color" content="#0a3d54">\n'
            '<meta name="mobile-web-app-capable" content="yes">\n'
            '<meta name="application-name" content="Pati de Vela">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
            '<meta name="apple-mobile-web-app-title" content="Pati de Vela">\n'
            '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n')

TAIL_PWA = ("""<script>
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('service-worker.js').catch(()=>{});});}
</script>
<script>
(function(){let deferred=null;const btn=document.getElementById('btnInstal');const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;if(btn&&!standalone)btn.style.display='block';});
if(btn)btn.addEventListener('click',async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;btn.style.display='none';}else if(isIOS){alert("Per instal·lar a l'iPhone o iPad:\\n\\n1. Toca Compartir a Safari.\\n2. Tria «Afegeix a la pantalla d'inici».\\n3. Confirma amb «Afegeix».");}});
window.addEventListener('load',()=>{if(isIOS&&!standalone&&btn)btn.style.display='block';});})();
</script>
""")

BTN_INSTAL = '  <div id="btnInstal" class="panell" style="display:none">⬇️ Instal·la</div>\n'


def escriu(nom, text):
    """Sempre amb LF: a Windows, Python convertiria cada salt de línia en CRLF i
       l'index.html publicat canviaria sencer encara que el codi fos el mateix."""
    open(nom, 'w', encoding='utf-8', newline='\n').write(text)


def separa(v2_text):
    """Treu del lliurable autònom el seu bloc de capçalera (manifest i icona en
       base64) i deixa el NUCLI, que és el mateix als dos lliurables."""
    a = v2_text.index('<link rel="manifest"')
    b = v2_text.index(ANCORA)
    head_std = v2_text[a:b]
    nucli = v2_text[:a] + v2_text[b:]
    # el nucli porta el botó d'instal·lació i el salt de línia del PWA
    nucli = nucli.replace(TITOL + '\n', TITOL + '\n\n', 1)
    nucli = nucli.replace('  <div id="btnConfig" class="panell">⚙️</div>\n',
                          BTN_INSTAL + '  <div id="btnConfig" class="panell">⚙️</div>\n', 1)
    nucli = nucli.replace('</script>\n</body>', '</script>\n\n</body>', 1)
    return nucli, head_std


def construeix(dev, head, tail, amb_boto):
    k = dev.index(ANCORA)
    out = dev[:k] + head + dev[k:]
    out = out.replace('\n</body>\n</html>', '\n' + tail + '</body>\n</html>', 1) if tail \
          else out
    if not amb_boto:
        out = out.replace(BTN_INSTAL, '', 1)
        out = out.replace(TITOL + '\n\n', TITOL + '\n', 1)
        out = out.replace('</script>\n\n</body>', '</script>\n</body>', 1)
    return out


if __name__ == '__main__':
    # Els missatges porten accents i ✔: a Windows, amb la sortida redirigida,
    # el cp1252 no els pot escriure i el build acabava amb error al final.
    sys.stdout.reconfigure(encoding='utf-8')
    if not os.path.exists('pati_vela_mobil.html'):
        v2 = open(V2, encoding='utf-8').read()
        dev, head_std = separa(v2)
        escriu('pati_vela_mobil.html', dev)
        escriu('build_head_std.txt', head_std)
        print('fitxer de desenvolupament creat:', len(dev), 'bytes')

    dev = open('pati_vela_mobil.html', encoding='utf-8').read()
    head_std = open('build_head_std.txt', encoding='utf-8').read()

    std = construeix(dev, head_std, '', False)
    pwa = construeix(dev, HEAD_PWA, TAIL_PWA, True)
    escriu('pati_vela_simulador_v6.html', std)
    # index.html és el MATEIX autònom, amb el nom que necessita GitHub Pages.
    # És un arxiu GENERAT: no s'edita mai a mà, es torna a construir des de
    # pati_vela_mobil.html. Així, publicar = fer el commit d'aquest arxiu.
    escriu('index.html', std)
    os.makedirs('pwa', exist_ok=True)
    escriu('pwa/index.html', pwa)

    # el JavaScript ha de ser IDÈNTIC als dos lliurables
    js = [re.search(r'<script>([\s\S]*?)</script>', t).group(1) for t in (dev, std, pwa)]
    assert js[0] == js[1] == js[2], 'el JS difereix entre lliurables'
    escriu('simM.js', js[0])

    print('autònom :', len(std), 'bytes  (pati_vela_simulador_v6.html i index.html)')
    print('PWA     :', len(pwa), 'bytes')
    print('JS idèntic als dos lliurables: ✔')
