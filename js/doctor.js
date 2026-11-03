document.addEventListener('DOMContentLoaded', () => {

    const formRegister = document.getElementById('formRegisterDoctor');

    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const inputs = formRegister.querySelectorAll('input');
            const payload = {
                nombre: inputs[0].value,
                usuario: inputs[1].value,
                email: inputs[2].value,
                telefono: inputs[3].value,
                cedula: inputs[4].value,
                especialidad: inputs[5].value,
                pass: inputs[6].value
            };

            if (payload.pass.length < 8) {
                mostrarAlerta('La contraseña debe contener al menos 8 caracteres.', 'error');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/doctores/registro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok) {
                    mostrarAlerta('¡Registro de médico exitoso!', 'success');
                    setTimeout(() => {
                        window.location.href = formRegister.getAttribute('action');
                    }, 1500);
                } else {
                    mostrarAlerta('No se pudo completar el registro: ' + (data.message || 'Intente de nuevo.'), 'error');
                }
            } catch (error) {
                console.error('Error de red al conectar con el servidor:', error);
                mostrarAlerta('Error de conexión con el servidor backend.', 'error');
            }
        });
    }

    
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const identificadorInput = loginForm.querySelector('input[type="text"], input[type="email"]');
            const passInput = loginForm.querySelector('input[type="password"]');

            const identificador = identificadorInput ? identificadorInput.value.trim() : '';
            const pass = passInput ? passInput.value.trim() : '';

            const isDoctorRole = document.getElementById('roleDoctor').checked;
            const endpoint = isDoctorRole 
                ? 'http://localhost:3000/api/doctores/login' 
                : 'http://localhost:3000/api/pacientes/login';

            const payload = { identificador, pass };

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok) {
                    mostrarAlerta('¡Bienvenido, ' + data.usuario.nombre + '!', 'success');
                    setTimeout(() => {
                        window.location.href = isDoctorRole ? 'doctor-dashboard.html' : 'patient-dashboard.html';
                    }, 1500);
                } else {
                    mostrarAlerta('Error al iniciar sesión: ' + (data.message || 'Credenciales inválidas.'), 'error');
                }
            } catch (error) {
                console.error('Error de red en el login:', error);
                mostrarAlerta('No se pudo conectar con el servidor para iniciar sesión.', 'error');
            }
        });
    }
});


function mostrarAlerta(mensaje, tipo = 'success') {
    let container = document.getElementById('customAlertContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'customAlertContainer';
        container.className = 'custom-alert-container';
        document.body.appendChild(container);
    }

    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert-box ${tipo}`;
    alertBox.innerHTML = `<p class="custom-alert-text">${mensaje}</p>`;

    container.appendChild(alertBox);

    setTimeout(() => {
        alertBox.style.opacity = '0';
        setTimeout(() => alertBox.remove(), 300);
    }, 4000);
}


function checkPasswordStrength(passwordInputId, barId, hintId) {
    const password = document.getElementById(passwordInputId).value;
    const bar = document.getElementById(barId);
    const hint = document.getElementById(hintId);

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++; 

    if (strength <= 2) {
        if(bar) bar.style.width = '33%';
        if(bar) bar.style.backgroundColor = 'red';
        if(hint) hint.textContent = 'Seguridad baja: usa letras, números y símbolos (mín. 8 caracteres).';
    } else if (strength === 3) {
        if(bar) bar.style.width = '66%';
        if(bar) bar.style.backgroundColor = 'orange';
        if(hint) hint.textContent = 'Seguridad media.';
    } else {
        if(bar) bar.style.width = '100%';
        if(bar) bar.style.backgroundColor = 'green';
        if(hint) hint.textContent = '¡Contraseña fuerte y segura!';
    }
}