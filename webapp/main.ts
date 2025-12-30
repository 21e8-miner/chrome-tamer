// Product logic for Chrome Tamer Landing Page

document.addEventListener('DOMContentLoaded', () => {
    console.log("Chrome Tamer Website Initialized");

    // Dynamic memory bar animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const fill = entry.target as HTMLElement;
                const targetWidth = fill.style.width;
                fill.style.width = '0%';
                setTimeout(() => {
                    fill.style.transition = 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)';
                    fill.style.width = targetWidth;
                }, 100);
                observer.unobserve(fill);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.memory-fill').forEach(bar => {
        observer.observe(bar);
    });

    // Spectral Pricing Engine (Novel Concept)
    const initSpectralPricing = () => {
        const pricingCards = document.querySelectorAll('.pricing-card.featured');
        const priceLabel = document.createElement('div');
        priceLabel.className = 'spectral-offer';
        priceLabel.style.cssText = `
            font-size: 0.75rem;
            color: #00ff88;
            margin-top: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: center;
        `;

        pricingCards.forEach(card => {
            card.querySelector('ul')?.after(priceLabel);

            // Simulate dynamic demand calculation
            setInterval(() => {
                const demand = Math.floor(Math.random() * 50) + 120;
                const savings = (Math.random() * 2 + 1).toFixed(1);
                priceLabel.innerText = `🔥 High Demand: ${demand} users optimizing | Avg Saved: ${savings}GB`;
            }, 3000);
        });
    };

    initSpectralPricing();

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
            if (targetId) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    window.scrollTo({
                        top: (targetElement as HTMLElement).offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});
