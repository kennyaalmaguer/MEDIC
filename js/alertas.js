function mostrarAlerta(texto, tipo, alCerrar) {
  let contenedor = document.getElementById('contenedorAlertas');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'contenedorAlertas';
    contenedor.style.cssText =
      'position:fixed;top:20px;right:20px;z-index:99999;' +
      'width:calc(100% - 40px);max-width:380px;';
    document.body.appendChild(contenedor);
  }

  const caja = document.createElement('div');
  caja.className = 'custom-alert-box' + (tipo === 'error' || tipo === 'success' ? ' ' + tipo : '');
  caja.setAttribute('role', 'alert');

  const p = document.createElement('p');
  p.className = 'custom-alert-text';
  p.textContent = texto;

  const cerrarBtn = document.createElement('button');
  cerrarBtn.type = 'button';
  cerrarBtn.innerHTML = '&times;';
  cerrarBtn.setAttribute('aria-label', 'Cerrar');
  cerrarBtn.style.cssText = 'background:none;border:0;font-size:22px;line-height:1;margin-left:12px;cursor:pointer;color:inherit;';

  let cerrada = false;
  function cerrar() {
    if (cerrada) return;
    cerrada = true;
    caja.remove();
    if (typeof alCerrar === 'function') alCerrar();
  }

  cerrarBtn.addEventListener('click', cerrar);
  caja.appendChild(p);
  caja.appendChild(cerrarBtn);
  contenedor.appendChild(caja);

  setTimeout(cerrar, 2500);   // se cierra sola y luego ejecuta alCerrar
}