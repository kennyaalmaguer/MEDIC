document.addEventListener('DOMContentLoaded', () => {
    const formRegister = document.getElementById('formRegisterPatient');

    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            
            const nombre = formRegister.querySelector('input[placeholder*="María"]') ? formRegister.querySelectorAll('input')[0].value : '';
            const inputs = formRegister.querySelectorAll('input');
            
            const payload = {
                nombre: inputs[0].value,
                usuario: inputs[1].value,
                email: inputs[2].value,
                telefono: inputs[3].value,
                pass: inputs[4].value
            };

            if (payload.pass.length < 8) {
                alert('La contraseña debe contener al menos 8 caracteres.');
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
                    alert('¡Registro de paciente exitoso!');
                    window.location.href = formRegister.getAttribute('action');
                } else {
                    alert('No se pudo completar el registro: ' + (data.message || 'Intente de nuevo.'));
                }

            } catch (error) {
                console.error('Error de red al conectar con el servidor:', error);
                alert('Error de conexión con el servidor backend.');
            }
        });
    }
});