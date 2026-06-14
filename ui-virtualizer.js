class VirtualList {
    constructor(container, options) {
        this.container = container;
        this.items = [];
        this.itemHeight = options.itemHeight || 46;
        this.overscan = options.overscan || 8;
        this.renderRow = options.renderRow;
        this.createRow = options.createRow;
        
        this.pool = [];
        
        this.innerContainer = document.createElement('div');
        this.innerContainer.style.position = 'relative';
        this.innerContainer.style.width = '100%';
        
        this.container.innerHTML = '';
        this.container.appendChild(this.innerContainer);
        
        this.lastStart = -1;
        this.lastEnd = -1;

        this.onScroll = this.onScroll.bind(this);
        this.container.addEventListener('scroll', this.onScroll);
        
        // Resize observer to handle container size changes
        this.resizeObserver = new ResizeObserver(() => {
            this.lastStart = -1;
            this.onScroll();
        });
        this.resizeObserver.observe(this.container);
    }

    setItems(items) {
        this.items = items;
        this.innerContainer.style.height = `${this.items.length * this.itemHeight}px`;
        this.lastStart = -1; // Force render
        this.onScroll();
    }

    onScroll() {
        const scrollTop = this.container.scrollTop;
        const viewportHeight = this.container.clientHeight;
        
        if (viewportHeight === 0 || this.items.length === 0) {
            for (let el of this.pool) {
                el.style.display = 'none';
            }
            return;
        }

        let start = Math.floor(scrollTop / this.itemHeight) - this.overscan;
        let end = Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.overscan;
        
        start = Math.max(0, start);
        end = Math.min(this.items.length - 1, end);
        
        if (start === this.lastStart && end === this.lastEnd) return;
        
        this.lastStart = start;
        this.lastEnd = end;
        
        const requiredPoolSize = end - start + 1;
        while (this.pool.length < requiredPoolSize) {
            const el = this.createRow();
            el.style.position = 'absolute';
            el.style.left = '0';
            el.style.width = '100%';
            el.style.boxSizing = 'border-box';
            this.pool.push(el);
            this.innerContainer.appendChild(el);
        }
        
        // Hide unused pool elements
        for (let i = requiredPoolSize; i < this.pool.length; i++) {
            this.pool[i].style.display = 'none';
        }
        
        // Active element logic for focus restoration
        const activeEl = document.activeElement;
        let lastFocusedIndex = -1;
        if (activeEl && this.pool.includes(activeEl)) {
            lastFocusedIndex = parseInt(activeEl.getAttribute('data-v-index'), 10);
            activeEl.blur();
        }

        let poolIndex = 0;
        let elementToFocus = null;

        for (let i = start; i <= end; i++) {
            const el = this.pool[poolIndex];
            el.style.display = 'flex'; // Consumer may override in renderRow
            el.style.top = `${i * this.itemHeight}px`;
            el.style.transform = 'none'; // Clear any virtualizer transform so CSS hover can apply cleanly
            el.setAttribute('data-v-index', i);
            
            // Allow consumer to update the content
            this.renderRow(el, this.items[i], i);
            
            if (i === lastFocusedIndex) {
                elementToFocus = el;
            }
            
            poolIndex++;
        }

        if (elementToFocus && document.activeElement !== elementToFocus) {
            elementToFocus.focus({ preventScroll: true });
        }
    }
}

window.VirtualList = VirtualList;
