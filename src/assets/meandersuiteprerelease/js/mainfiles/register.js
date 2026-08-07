const form = document.getElementById('multiStepForm');

function showStep(step) {
    document.querySelectorAll('.form-step').forEach(div => div.classList.remove('active'));
    const target = document.getElementById('step' + step);
    if (target) target.classList.add('active');
    document.getElementById('progressBar').style.width = (step * 33.33) + '%';
}

function nextStep(step) {
    const currentStep = document.querySelector('.form-step.active');
    const inputs = currentStep.querySelectorAll('input');

    let valid = true;

    inputs.forEach(input => {
        if (!input.value.trim() || !input.checkValidity()) {
        input.classList.add('is-invalid');
        valid = false;
        } else {
        input.classList.remove('is-invalid');
        }
    });

    if (!valid) return;

    showStep(step);
}

function goToStep(step) {
    showStep(step);
}

form.addEventListener('submit', function (e) {
    const pass = document.getElementById('password');
    const confirm = document.getElementById('passwordconf');

    if (pass.value !== confirm.value) {
        confirm.classList.add('is-invalid');
        e.preventDefault();
        return;
    }

    if (!form.checkValidity()) {
        e.preventDefault();
        form.classList.add('was-validated');
    }
});