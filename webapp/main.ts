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

    // Technical Features Animation
    const initTechnicalShowcase = () => {
        const featureDetails = {
            "Nash Equilibrium": "Every background tab acts as a player in a resource game. Utility is calculated as B(t) - [C_base + Penalty(redundancy)].",
            "Pressure-Aware": "The engine monitors system RAM pressure. Cost coefficients scale non-linearly when physical RAM > 80% used.",
            "CPU Affinity": "On Windows, background Chromium renders are isolated to efficiency cores (E-Cores) to prevent P-Core jitter.",
            "Kernel Renicing": "On macOS/Unix, background processes are dynamically reniced to priority 19 (Idle) to ensure zero active-task lag."
        };

        const pricingCard = document.querySelector('.pricing-card.featured');
        if (pricingCard) {
            const techInfo = document.createElement('div');
            techInfo.className = 'technical-details';
            techInfo.style.cssText = `
                font-size: 0.8rem;
                color: var(--accent);
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid rgba(255,255,255,0.05);
                font-family: 'Courier New', monospace;
            `;

            let currentIdx = 0;
            const keys = Object.keys(featureDetails);

            const updateInfo = () => {
                const key = keys[currentIdx];
                techInfo.innerHTML = `<span style="opacity:0.5">></span> <span style="font-weight:700">${key}:</span> ${featureDetails[key as keyof typeof featureDetails]}`;
                currentIdx = (currentIdx + 1) % keys.length;
            };

            pricingCard.appendChild(techInfo);
            updateInfo();
            setInterval(updateInfo, 5000);
        }
    };

    initTechnicalShowcase();

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
