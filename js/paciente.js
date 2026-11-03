document.addEventListener('DOMContentLoaded', () => {
    const formRegister = document.getElementById('formRegisterPatient');

    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const inputs = formRegister.querySelectorAll('input');
            const payload = {
                nombre: inputs[0].value,
                usuario: inputs[1].value,
                email: inputs[2].value,
                telefono: inputs[3].value,
                pass: inputs[4].value
            };

            if (payload.pass.length < 8) {
                mostrarAlerta('La contraseña debe contener al menos 8 caracteres.', 'error');
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/pacientes/registro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok) {
                    mostrarAlerta('¡Registro de paciente exitoso!', 'success');
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