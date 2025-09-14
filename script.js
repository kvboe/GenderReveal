class GiftRegistry {
    constructor() {
        this.SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyrIgYbu_GiDE5JJ0HmBVArvTbyRNWb0hfke5tN4AkfL0JyFw2LxQpN2UGWUQMTxZS8dg/exec';
        this.gifts = [];
        this.selectedGift = null;
        this.lastDataVersion = null;

        this.init();
    }

    init() {
        this.loadGifts();
        this.setupEventListeners();
    }

    formatPrice(price) {
        if (!price) return '';

        const numericPrice = price.toString().replace(/[^\d.,]/g, '');
        const number = parseFloat(numericPrice.replace(',', '.'));

        if (isNaN(number)) {
            return price + ' zł';
        }

        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(number);
    }

    async checkForUpdates() {
        try {
            const url = `${this.SCRIPT_URL}?action=checkVersion&t=${Date.now()}`;
            const response = await fetch(url, { method: 'GET' });
            const data = await response.json();

            if (data.success && data.version) {
                if (this.lastDataVersion && this.lastDataVersion !== data.version) {
                    console.log('Data changed, reloading gifts');
                    await this.loadGifts();
                }
                this.lastDataVersion = data.version;
            }
        } catch (error) {
            console.warn('Update check failed:', error.message);
        }
    }

    async loadGifts() {
        try {
            const url = `${this.SCRIPT_URL}?action=getGifts&t=${Date.now()}`;
            const response = await fetch(url, { method: 'GET' });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();

            if (data.success && data.gifts && data.gifts.length > 0) {
                this.gifts = data.gifts;
                this.lastDataVersion = data.version;
                this.renderGifts();
            } else if (data.error) {
                throw new Error(data.error);
            } else {
                this.showError('Brak prezentów do wyświetlenia. Sprawdź czy arkusz zawiera dane.');
            }
        } catch (error) {
            console.error('Loading error:', error.message);
            this.showError(`Błąd ładowania danych: ${error.message}`);
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }

    renderGifts() {
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
            const formattedPrice = this.formatPrice(gift.price);

            const giftCard = `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card gift-card h-100 ${isReserved ? 'reserved' : ''}">
                        <div class="position-relative">
                            <img src="${gift.image}" class="card-img-top" alt="${gift.name}"
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
                            <div class="price-container">
                                <h5 class="card-title gift-title">${gift.name}</h5>
                                <span class="badge price-tag px-3 py-2">${formattedPrice}</span>
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
                    <span class="badge price-tag px-3 py-2">${this.formatPrice(this.selectedGift.price)}</span>
                </div>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
        modal.show();
    }

    setupEventListeners() {
        const confirmBtn = document.getElementById('confirm-reservation');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmReservation();
            });
        } else {
            console.warn('Confirm button not found');
        }

        setInterval(() => {
            this.checkForUpdates();
        }, 30000);
    }

    async confirmReservation() {
        const confirmBtn = document.getElementById('confirm-reservation');
        const originalText = confirmBtn.innerHTML;

        confirmBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Rezerwuję...';
        confirmBtn.disabled = true;

        try {
            const url = `${this.SCRIPT_URL}?action=updateReservation&rowIndex=${this.selectedGift.rowIndex}&status=zarezerwowane&t=${Date.now()}`;

            const response = await fetch(url, { method: 'GET' });

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
            console.error('Reservation failed:', error.message);
            alert('Nie udało się zarezerwować prezentu. Spróbuj ponownie.');
        } finally {
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

document.addEventListener('DOMContentLoaded', () => {
    new GiftRegistry();
});
