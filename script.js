function initScript() {

    // Intersection Observer for Scroll Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once animation has triggered
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Select all elements that need to animate in
    const animatedElements = document.querySelectorAll('.fade-up, .fade-in');
    animatedElements.forEach(el => observer.observe(el));

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
        } else {
            navbar.style.background = 'rgba(250, 250, 250, 0.8)';
            navbar.style.boxShadow = 'none';
        }
    });

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            
            // Toggle icon
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();

                // Close mobile menu if open
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    const icon = mobileMenuBtn.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }

                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScript);
} else {
    initScript();
}

// --- Supabase & Booking Modal Logic ---

const SUPABASE_URL = 'https://nkkyyqqqusodhwqvprik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ra3l5cXFxdXNvZGh3cXZwcmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMjU1MDIsImV4cCI6MjA4ODYwMTUwMn0.Gs5bdRrv9HNViruVjr8mQl4Oh2Ei1Hyryr0vxpdPPhU';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const EMPRESA_ID = 'psicologo_1';

const bookingModal = document.getElementById('bookingModal');
const bookingForm = document.getElementById('bookingForm');

let currentStep = 1;
const totalSteps = 4;

function showStep(step) {
    // Escucha todos los pasos
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.remove('active');
    });

    // Actualiza los puntos de la barra de progreso
    document.querySelectorAll('.stepper-progress .step').forEach(el => {
        const stepNum = parseInt(el.getAttribute('data-step'));
        el.className = 'step'; // reset
        if (stepNum === step) {
            el.classList.add('active');
        } else if (stepNum < step) {
            el.classList.add('completed');
        }
    });

    // Actualiza las líneas de progreso
    document.querySelectorAll('.stepper-progress .step-line').forEach((el, index) => {
        if (index < step - 1) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });

    // Muestra el paso actual
    const stepEl = document.getElementById(`step-${step}`);
    if (stepEl) {
        stepEl.classList.add('active');
    }
}

window.nextStep = function (step) {
    const currentStepEl = document.getElementById(`step-${step}`);
    if (!currentStepEl) return;

    const inputs = currentStepEl.querySelectorAll('input, select, textarea');
    let isValid = true;

    for (let input of inputs) {
        if (!input.checkValidity()) {
            input.reportValidity();
            isValid = false;
            break; // Stop at first invalid field to display message
        }
    }

    if (isValid && step < totalSteps) {
        currentStep = step + 1;
        showStep(currentStep);
    }
}

window.prevStep = function (step) {
    if (step > 1) {
        currentStep = step - 1;
        showStep(currentStep);
    }
}

window.openBookingModal = function (servicioPreset = '') {
    bookingModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling

    // Reset Stepper
    currentStep = 1;
    showStep(1);

    // Preset servicio si se pasó desde el botón
    const servicioSelect = document.getElementById('servicio');
    if (servicioSelect && servicioPreset) {
        Array.from(servicioSelect.options).forEach(opt => {
            if (opt.value.includes(servicioPreset)) {
                servicioSelect.value = opt.value;
            }
        });
    }

    // Reset Date/Time fields cleanly
    const horaReservaSelect = document.getElementById('hora_reserva');
    if (horaReservaSelect) {
        horaReservaSelect.innerHTML = '<option value="">Primero selecciona un día</option>';
        horaReservaSelect.disabled = true;
    }
}

window.closeBookingModal = function () {
    bookingModal.classList.remove('active');
    document.body.style.overflow = 'auto'; // Re-enable scrolling
    bookingForm.reset();
    currentStep = 1;
    showStep(1);
}

// Close modal when clicking outside of it
if (bookingModal) {
    bookingModal.addEventListener('click', (e) => {
        if (e.target === bookingModal) {
            closeBookingModal();
        }
    });
}

// Set up dynamic minimum date for calendar
const fechaReservaInput = document.getElementById('fecha_reserva');
const horaReservaSelect = document.getElementById('hora_reserva');

if (fechaReservaInput && horaReservaSelect) {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);
    const todayStr = localISOTime.split('T')[0];
    fechaReservaInput.setAttribute('min', todayStr);

    fechaReservaInput.addEventListener('change', async function () {
        const dateStr = this.value;
        if (!dateStr) {
            horaReservaSelect.innerHTML = '<option value="">Primero selecciona un día</option>';
            horaReservaSelect.disabled = true;
            return;
        }

        const selectedDate = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = selectedDate.getDay();

        if (dayOfWeek === 0) {
            Swal.fire('Día no disponible', 'Los domingos no hay atención. Por favor, selecciona otro día.', 'warning');
            this.value = '';
            horaReservaSelect.innerHTML = '<option value="">Primero selecciona un día</option>';
            horaReservaSelect.disabled = true;
            return;
        }

        let slots = [];
        if (dayOfWeek === 6) { // Sabado
            slots = ['09:00', '10:00', '11:00', '12:00', '13:00'];
        } else { // Lunes a Viernes
            slots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
        }

        horaReservaSelect.innerHTML = '<option value="">Cargando horarios...</option>';
        horaReservaSelect.disabled = true;

        try {
            const { data, error } = await supabaseClient
                .from('aareservas')
                .select('hora_reserva')
                .eq('empresa_id', EMPRESA_ID)
                .eq('fecha_reserva', dateStr)
                .neq('estado', 'Cancelado');

            if (error) throw error;

            // Extraer solo la parte "HH:MM" porque Supabase puede devolver "10:00:00"
            const occupiedTimes = data.map(res => res.hora_reserva.substring(0, 5));

            const availableSlots = slots.filter(slot => !occupiedTimes.includes(slot));

            if (availableSlots.length === 0) {
                horaReservaSelect.innerHTML = '<option value="">Sin turnos disponibles este día</option>';
                horaReservaSelect.disabled = true;
            } else {
                horaReservaSelect.innerHTML = '<option value="">Selepcioná una hora...</option>' + availableSlots.map(slot => `<option value="${slot}">${slot}</option>`).join('');
                horaReservaSelect.disabled = false;
            }

        } catch (error) {
            console.error(error);
            horaReservaSelect.innerHTML = '<option value="">Error al buscar horarios</option>';
            Swal.fire('Error', 'Hubo un error cargando los horarios. Intenta más tarde.', 'error');
        }
    });
}

if (bookingForm) {
    // Prevent default Enter key behavior (which submits the form prematurely)
    bookingForm.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const activeStep = document.querySelector('.step-content.active');
            if (activeStep) {
                const nextBtn = activeStep.querySelector('.btn-next');
                if (nextBtn) {
                    nextBtn.click();
                } else {
                    const submitBtn = activeStep.querySelector('.btn-submit');
                    if (submitBtn) submitBtn.click();
                }
            }
        }
    });

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Final validation check to avoid silent browser block on hidden required fields
        if (!bookingForm.checkValidity()) {
            bookingForm.reportValidity();
            return;
        }

        const submitBtn = bookingForm.querySelector('.btn-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        submitBtn.disabled = true;

        const formData = new FormData(bookingForm);
        const reservaData = {
            empresa_id: EMPRESA_ID,
            nombre_cliente: formData.get('nombre_cliente'),
            telefono_cliente: formData.get('telefono_cliente'),
            email_cliente: formData.get('email_cliente') || null,
            servicio: formData.get('servicio'),
            modalidad: formData.get('modalidad'),
            fecha_reserva: formData.get('fecha_reserva'),
            hora_reserva: formData.get('hora_reserva'),
            mensaje: formData.get('mensaje') || null,
            estado: 'Pendiente'
        };

        try {
            const { data, error } = await supabaseClient
                .from('aareservas')
                .insert([reservaData]);

            if (error) throw error;

            // Success
            await Swal.fire({
                title: '¡Turno solicitado!',
                text: 'Tu solicitud fue enviada correctamente. Me contactaré a la brevedad para confirmar.',
                icon: 'success',
                confirmButtonColor: '#25D366'
            });

            closeBookingModal();
        } catch (error) {
            console.error('Error al guardar reserva:', error);
            Swal.fire({
                title: 'Error',
                text: 'Hubo un problema al procesar tu solicitud. Por favor intentá nuevamente.',
                icon: 'error',
                confirmButtonColor: '#2C5282'
            });
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}
