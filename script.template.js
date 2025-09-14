class GiftRegistry {
    constructor() {
        this.SCRIPT_URL = '{{APPS_SCRIPT_URL}}';
        this.gifts = [];
        this.selectedGift = null;

        console.log('🚀 Inicjalizacja GiftRegistry...');
        console.log('🔗 Apps Script URL:', this.SCRIPT_URL);

        this.init();
    }

    init() {
        this.loadGifts();
        this.setupEventListeners();
    }

    async loadGifts() {
        console.log('📥 Ładowanie danych przez Google Apps Script...');

        try {
            // FormData zamiast JSON - omija preflight request
            const formData = new FormData();
            formData.append('action', 'getGifts');

            const response = await fetch(this.SCRIPT_URL, {
                method: 'POST',
                body: formData  // BEZ Content-Type header!
            });

            console.log('📡 Odpowiedź serwera:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Błąd HTTP:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('📊 Otrzymane dane:', data);

            if (data.success && data.gifts && data.gifts.length > 0) {
                console.log(`✅ Znaleziono ${data.gifts.length} prezentów`);
                this.gifts = data.gifts;
                this.renderGifts();
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                console.warn('⚠️ Brak prezentów w odpowiedzi');
                this.showError('Brak prezentów do wyświetlenia. Sprawdź czy arkusz zawiera dane.');
            }
        } catch (error) {
            console.error('💥 Błąd podczas ładowania danych:', error);
            this.showError(`Błąd ładowania danych: ${error.message}`);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    renderGifts() {
        console.log('🎨 Renderowanie prezentów...');
        const container = document.getElementById('gifts-container');

        if (this.gifts.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning">
                        <i class="bi bi-exclamation-triangle"></i>
                        Brak prezentów do wyświetlenia.
                    </div>
                </div>
            `;
            container.style.display = 'flex';
            return;
        }

        container.innerHTML = '';

        const sortedGifts = [...this.gifts].sort((a, b) => {
            const aReserved = a.status.toLowerCase() === 'zarezerwowane';
            const bReserved = b.status.toLowerCase() === 'zarezerwowane';
            return aReserved - bReserved;
        });

        sortedGifts.forEach(gift => {
            const isReserved = gift.status.toLowerCase() === 'zarezerwowane';

            const giftCard = `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card gift-card h-100 ${isReserved ? 'reserved' : ''}">
                        <div class="position-relative">
                            <img src="${gift.image}" class="card-img-top" alt="${gift.name}"
                                 style="height: 200px; object-fit: cover;"
                                 onerror="this.src='https://via.placeholder.com/300x200?text=Brak+zdjęcia'">
                            ${isReserved ? `
                                <div class="position-absolute top-0 end-0 m-2">
                                    <span class="badge reserved-badge">
                                        <i class="bi bi-check-circle"></i> Zarezerwowane
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${gift.name}</h5>
                            <div class="mb-2">
                                <span class="badge price-tag px-3 py-2">${gift.price}</span>
                            </div>
                            <div class="mt-auto">
                                ${gift.link ? `<a href="${gift.link}" target="_blank" class="btn btn-outline-primary btn-sm mb-2 w-100">
                                    <i class="bi bi-eye"></i> Zobacz produkt
                                </a>` : ''}
                                ${isReserved ?
                    `<div class="alert alert-secondary mb-0 text-center">
                                        <i class="bi bi-lock-fill"></i> Ten prezent jest już zarezerwowany
                                    </div>` :
                    `<button class="btn btn-success reserve-btn w-100" data-gift-id="${gift.id}">
                                        <i class="bi bi-gift"></i> Rezerwuję ten prezent
                                    </button>`
                }
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += giftCard;
        });

        container.style.display = 'flex';
        this.attachReserveButtons();
        this.showStats();

        console.log('✅ Prezenty wyrenderowane pomyślnie');
    }

    showStats() {
        const total = this.gifts.length;
        const reserved = this.gifts.filter(g => g.status.toLowerCase() === 'zarezerwowane').length;
        const available = total - reserved;

        if (!document.getElementById('stats-container')) {
            const statsHtml = `
                <div id="stats-container" class="row mb-4">
                    <div class="col-12">
                        <div class="card bg-light">
                            <div class="card-body">
                                <div class="row text-center">
                                    <div class="col-md-4">
                                        <h4 class="text-primary mb-1">${total}</h4>
                                        <small class="text-muted">Wszystkich prezentów</small>
                                    </div>
                                    <div class="col-md-4">
                                        <h4 class="text-success mb-1">${available}</h4>
                                        <small class="text-muted">Dostępnych</small>
                                    </div>
                                    <div class="col-md-4">
                                        <h4 class="text-secondary mb-1">${reserved}</h4>
                                        <small class="text-muted">Zarezerwowanych</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const container = document.getElementById('gifts-container');
            container.insertAdjacentHTML('beforebegin', statsHtml);
        } else {
            const statsContainer = document.getElementById('stats-container');
            statsContainer.querySelector('.text-primary').textContent = total;
            statsContainer.querySelector('.text-success').textContent = available;
            statsContainer.querySelector('.text-secondary').textContent = reserved;
        }
    }

    attachReserveButtons() {
        document.querySelectorAll('.reserve-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const giftId = parseInt(e.target.getAttribute('data-gift-id'));
                this.openConfirmationModal(giftId);
            });
        });
    }

    openConfirmationModal(giftId) {
        this.selectedGift = this.gifts.find(g => g.id === giftId);

        const selectedGiftDiv = document.getElementById('selected-gift');
        selectedGiftDiv.innerHTML = `
            <div class="card">
                <div class="card-body text-center">
                    <h5 class="card-title">${this.selectedGift.name}</h5>
                    <span class="badge price-tag px-3 py-2">${this.selectedGift.price}</span>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        modal.show();
    }

    setupEventListeners() {
        document.getElementById('confirm-reservation').addEventListener('click', () => {
            this.confirmReservation();
        });

        setInterval(() => {
            console.log('🔄 Automatyczne odświeżanie danych...');
            this.loadGifts();
        }, 15000);
    }

    async confirmReservation() {
        console.log('✅ Potwierdzanie rezerwacji...');
        const confirmBtn = document.getElementById('confirm-reservation');
        const originalText = confirmBtn.innerHTML;

        confirmBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Rezerwuję...';
        confirmBtn.disabled = true;

        try {
            // FormData dla rezerwacji
            const formData = new FormData();
            formData.append('action', 'updateReservation');
            formData.append('rowIndex', this.selectedGift.rowIndex);
            formData.append('status', 'zarezerwowane');

            const response = await fetch(this.SCRIPT_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
                modal.hide();
                this.showSuccessMessage();
                setTimeout(() => this.loadGifts(), 1000);
            } else {
                throw new Error(data.error || 'Nieznany błąd serwera');
            }

        } catch (error) {
            console.error('💥 Błąd podczas rezerwacji:', error);
            alert('Nie udało się zarezerwować prezentu. Spróbuj ponownie.');
        } finally {
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }

    showSuccessMessage() {
        const alert = document.getElementById('success-alert');
        alert.style.display = 'block';
        setTimeout(() => alert.style.display = 'none', 4000);
    }

    showError(message) {
        const container = document.getElementById('gifts-container');
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i> ${message}
                </div>
            </div>
        `;
        container.style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GiftRegistry();
});
