class TierListMaker {
    constructor() {
        this.tiers = [
            { id: 1, name: 'Jen', items: [] },
            { id: 2, name: 'Kelsey', items: [] },
            { id: 3, name: 'James', items: [] },
            { id: 4, name: 'Dharam', items: [] },
            { id: 5, name: 'Kayla', items: [] },
            { id: 6, name: 'Cody', items: [] },
            { id: 7, name: 'TJ', items: [] }
        ];
        this.unrankedItems = [];
        this.draggedItem = null;
        this.itemIdCounter = 1;
        this.tierIdCounter = 8;

        this.init();
    }

    init() {
        this.renderTiers();
        this.renderUnrankedItems();
        this.attachEventListeners();
        this.updateTierColors();
    }

    attachEventListeners() {
        document.getElementById('add-tier').addEventListener('click', () => this.addTier());
        document.getElementById('add-text-item').addEventListener('click', () => this.addTextItem());
        
        document.addEventListener('paste', (e) => this.handlePaste(e));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.draggedItem) {
                this.deleteItem(this.draggedItem);
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.handleDragOver(e);
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleDrop(e);
            this.clearDropHighlights();
        });

        document.addEventListener('dragend', (e) => {
            this.clearDragState();
        });
    }

    renderTiers() {
        const container = document.getElementById('tier-container');
        container.innerHTML = '';

        this.tiers.forEach((tier, index) => {
            const tierRow = document.createElement('div');
            tierRow.className = 'tier-row';
            tierRow.dataset.tierId = tier.id;

            tierRow.innerHTML = `
                <div class="tier-label tier-colors-${this.getTierColorClass(index)}">
                    <input type="text" value="${tier.name}" onchange="tierList.updateTierName(${tier.id}, this.value)">
                    <button class="delete-tier" onclick="tierList.deleteTier(${tier.id})">×</button>
                </div>
                <div class="tier-content" data-tier-id="${tier.id}">
                    ${tier.items.map(item => this.renderItem(item)).join('')}
                </div>
            `;

            container.appendChild(tierRow);
        });
    }

    renderUnrankedItems() {
        const container = document.getElementById('unranked-items');
        const dropZone = container.querySelector('.drop-zone');
        
        container.innerHTML = '';
        if (dropZone) container.appendChild(dropZone);
        
        this.unrankedItems.forEach(item => {
            const itemElement = this.createItemElement(item);
            container.appendChild(itemElement);
        });
    }

    renderItem(item) {
        if (item.type === 'image') {
            const width = item.aspectRatio ? Math.min(200, Math.max(64, 64 * item.aspectRatio)) : 64;
            return `
                <div class="item" draggable="true" data-item-id="${item.id}" ondragstart="tierList.dragStart(event)" style="width: ${width}px;">
                    <img src="${item.content}" alt="Item">
                    <button class="delete-item" onclick="tierList.deleteItem('${item.id}')">×</button>
                </div>
            `;
        } else {
            return `
                <div class="item text-item" draggable="true" data-item-id="${item.id}" ondragstart="tierList.dragStart(event)">
                    ${item.content}
                    <button class="delete-item" onclick="tierList.deleteItem('${item.id}')">×</button>
                </div>
            `;
        }
    }

    createItemElement(item) {
        const itemElement = document.createElement('div');
        itemElement.className = item.type === 'image' ? 'item' : 'item text-item';
        itemElement.draggable = true;
        itemElement.dataset.itemId = item.id;
        itemElement.addEventListener('dragstart', (e) => this.dragStart(e));

        if (item.type === 'image') {
            const width = item.aspectRatio ? Math.min(200, Math.max(64, 64 * item.aspectRatio)) : 64;
            itemElement.style.width = `${width}px`;
            itemElement.innerHTML = `
                <img src="${item.content}" alt="Item">
                <button class="delete-item" onclick="tierList.deleteItem('${item.id}')">×</button>
            `;
        } else {
            itemElement.innerHTML = `
                ${item.content}
                <button class="delete-item" onclick="tierList.deleteItem('${item.id}')">×</button>
            `;
        }

        return itemElement;
    }

    getTierColorClass(index) {
        const colors = ['s', 'a', 'b', 'c', 'd', 'e', 'f'];
        return colors[index % colors.length];
    }

    updateTierColors() {
        const tierRows = document.querySelectorAll('.tier-row');
        tierRows.forEach((row, index) => {
            const label = row.querySelector('.tier-label');
            label.className = `tier-label tier-colors-${this.getTierColorClass(index)}`;
        });
    }

    addTier() {
        const newTier = {
            id: this.tierIdCounter++,
            name: 'New Tier',
            items: []
        };
        this.tiers.push(newTier);
        this.renderTiers();
        this.updateTierColors();
    }

    deleteTier(tierId) {
        const tierIndex = this.tiers.findIndex(t => t.id === tierId);
        if (tierIndex === -1) return;

        const tier = this.tiers[tierIndex];
        this.unrankedItems.push(...tier.items);
        this.tiers.splice(tierIndex, 1);
        
        this.renderTiers();
        this.renderUnrankedItems();
        this.updateTierColors();
    }

    updateTierName(tierId, newName) {
        const tier = this.tiers.find(t => t.id === tierId);
        if (tier) {
            tier.name = newName;
        }
    }

    addTextItem() {
        const text = prompt('Enter text for the item:');
        if (!text) return;

        const item = {
            id: `item-${this.itemIdCounter++}`,
            type: 'text',
            content: text
        };
        
        this.unrankedItems.push(item);
        this.renderUnrankedItems();
    }

    handlePaste(e) {
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const aspectRatio = img.width / img.height;
                        const newItem = {
                            id: `item-${this.itemIdCounter++}`,
                            type: 'image',
                            content: event.target.result,
                            aspectRatio: aspectRatio
                        };
                        
                        this.unrankedItems.push(newItem);
                        this.renderUnrankedItems();
                    };
                    img.src = event.target.result;
                };
                
                reader.readAsDataURL(blob);
            }
        }
    }

    dragStart(e) {
        this.draggedItem = e.target.dataset.itemId || e.target.closest('.item').dataset.itemId;
        e.target.closest('.item').classList.add('dragging');
        
        const dragPreview = document.getElementById('drag-preview');
        const itemElement = e.target.closest('.item');
        
        if (itemElement.querySelector('img')) {
            dragPreview.innerHTML = `<img src="${itemElement.querySelector('img').src}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            dragPreview.innerHTML = itemElement.textContent.replace('×', '');
            dragPreview.style.background = 'linear-gradient(135deg, #4a5568, #2d3748)';
            dragPreview.style.display = 'flex';
            dragPreview.style.alignItems = 'center';
            dragPreview.style.justifyContent = 'center';
            dragPreview.style.fontSize = '12px';
            dragPreview.style.fontWeight = 'bold';
            dragPreview.style.color = 'white';
            dragPreview.style.textAlign = 'center';
        }
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setDragImage(dragPreview, 32, 32);
        
        console.log('Drag started for item:', this.draggedItem);
    }

    allowDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    drop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!this.draggedItem) return;

        const targetTierId = parseInt(e.currentTarget.closest('.tier-row').dataset.tierId);
        const item = this.findAndRemoveItem(this.draggedItem);
        
        if (item) {
            const tier = this.tiers.find(t => t.id === targetTierId);
            if (tier) {
                tier.items.push(item);
            }
            
            this.renderTiers();
            this.renderUnrankedItems();
        }
        
        this.clearDragState();
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.draggedItem) return;
        
        this.clearDropHighlights();
        
        const tierContent = e.target.closest('.tier-content');
        if (tierContent) {
            tierContent.classList.add('drag-over');
            return;
        }
        
        const unrankedItems = e.target.closest('.unranked-items');
        if (unrankedItems) {
            unrankedItems.classList.add('drag-over');
        }
    }

    clearDropHighlights() {
        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }

    findAndRemoveItem(itemId) {
        let item = null;
        
        const unrankedIndex = this.unrankedItems.findIndex(i => i.id === itemId);
        if (unrankedIndex !== -1) {
            item = this.unrankedItems.splice(unrankedIndex, 1)[0];
        } else {
            for (let tier of this.tiers) {
                const itemIndex = tier.items.findIndex(i => i.id === itemId);
                if (itemIndex !== -1) {
                    item = tier.items.splice(itemIndex, 1)[0];
                    break;
                }
            }
        }
        
        return item;
    }

    deleteItem(itemId) {
        this.findAndRemoveItem(itemId);
        this.renderTiers();
        this.renderUnrankedItems();
    }

    handleDrop(e) {
        console.log('Drop event triggered', this.draggedItem);
        if (!this.draggedItem) return;

        const tierContent = e.target.closest('.tier-content');
        const unrankedItems = e.target.closest('.unranked-items');
        
        console.log('Drop targets:', { tierContent, unrankedItems });
        
        if (tierContent) {
            const targetTierId = parseInt(tierContent.dataset.tierId);
            console.log('Dropping into tier:', targetTierId);
            const item = this.findAndRemoveItem(this.draggedItem);
            
            if (item) {
                const tier = this.tiers.find(t => t.id === targetTierId);
                if (tier) {
                    tier.items.push(item);
                    console.log('Item added to tier successfully');
                }
                
                this.renderTiers();
                this.renderUnrankedItems();
            }
        } else if (unrankedItems) {
            console.log('Dropping into unranked');
            const item = this.findAndRemoveItem(this.draggedItem);
            if (item) {
                this.unrankedItems.push(item);
                this.renderTiers();
                this.renderUnrankedItems();
            }
        }
        
        this.clearDragState();
    }

    clearDragState() {
        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
        });
        this.draggedItem = null;
        this.clearDropHighlights();
    }
}

const tierList = new TierListMaker();