class GiftRegistry {
    constructor() {
        // Wszystkie wrażliwe dane jako placeholders
        this.API_KEY = '{{GOOGLE_API_KEY}}';
        this.SPREADSHEET_ID = '{{SPREADSHEET_ID}}';
        this.SCRIPT_URL = '{{APPS_SCRIPT_URL}}';
        this.RANGE = 'A2:E1000';

        this.gifts = [];
        this.selectedGift = null;

        console.log('🚀 Inicjalizacja GiftRegistry...');
        console.log('📋 Spreadsheet ID:', this.SPREADSHEET_ID);
        console.log('🔑 API Key (pierwsze 10 znaków):', this.API_KEY.substring(0, 10) + '...');

        this.init();
    }

    init() {
        this.loadGifts();
        this.setupEventListeners();
    }

    async loadGifts() {
        console.log('📥 Ładowanie danych z Google Sheets...');

        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${this.RANGE}?key=${this.API_KEY}`;
            console.log('🌐 URL zapytania:', url);

            const response = await fetch(url);
            console.log('📡 Odpowiedź serwera:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Błąd HTTP:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('📊 Otrzymane dane:', data);

            if (data.values && data.values.length > 0) {
                console.log(`✅ Znaleziono ${data.values.length} wierszy danych`);

                this.gifts = data.values.map((row, index) => ({
                    id: index,
                    name: row[0] || '',
                    link: row[1] || '',
                    price: row[2] || '',
                    image: row[3] || 'https://via.placeholder.com/300x200?text=Brak+zdjęcia',
                    status: row[4] || 'dostępne',
                    rowIndex: index + 2
                })).filter(gift => gift.name.trim() !== '');

                console.log('🎁 Przetworzonych prezentów:', this.gifts.length);
                this.renderGifts();
            } else {
                console.warn('⚠️ Brak danych w arkuszu lub pusty arkusz');
                this.showError('Arkusz jest pusty lub nie zawiera danych w zakresie A2:E1000');
            }
        } catch (error) {
            console.error('💥 Błąd podczas ładowania danych:', error);

            if (error.message.includes('CORS')) {
                this.showError('Błąd CORS. Sprawdź konfigurację API Key i uprawnienia arkusza.');
            } else if (error.message.includes('403')) {
                this.showError('Brak uprawnień. Sprawdź API Key i czy arkusz jest publiczny.');
            } else if (error.message.includes('404')) {
                this.showError('Nie znaleziono arkusza. Sprawdź ID arkusza.');
            } else {
                this.showError(`Błąd ładowania danych: ${error.message}`);
            }
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
                        Brak prezentów do wyświetlenia. Sprawdź czy arkusz zawiera dane.
                    </div>
                </div>
            `;
            container.style.display = 'flex';
            return;
        }

        container.innerHTML = '';

        // Sortuj: dostępne najpierw
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
            // Zaktualizuj istniejące statystyki
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

        // Pokaż spinner
        confirmBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Rezerwuję...';
        confirmBtn.disabled = true;

        try {
            // Aktualizacja statusu przez Google Apps Script
            const response = await fetch(this.SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateReservation',
                    rowIndex: this.selectedGift.rowIndex,
                    status: 'zarezerwowane'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update reservation');
            }

            // Zamknij modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
            modal.hide();

            // Pokaż komunikat sukcesu
            this.showSuccessMessage();

            // Odśwież listę
            setTimeout(() => {
                this.loadGifts();
            }, 1000);

        } catch (error) {
            console.error('Błąd podczas rezerwacji:', error);
            alert('Nie udało się zarezerwować prezentu. Spróbuj ponownie.');
        } finally {
            // Przywróć przycisk
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }

    showSuccessMessage() {
        const alert = document.getElementById('success-alert');
        alert.style.display = 'block';

        setTimeout(() => {
            alert.style.display = 'none';
        }, 4000);
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

// Inicjalizacja aplikacji
document.addEventListener('DOMContentLoaded', () => {
    new GiftRegistry();
});
