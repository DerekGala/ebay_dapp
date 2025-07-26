// Data Service Layer for Real Data Integration

class DataService {
  constructor() {
    this.contract = null;
    this.products = [];
    this.userProducts = [];
    this.userBids = [];
    this.userArbitrations = [];
  }

  async initialize() {
    try {
      this.contract = await EcommerceStore.deployed();
      await this.loadAllData();
    } catch (error) {
      console.error('Failed to initialize data service:', error);
      throw error;
    }
  }

  async loadAllData() {
    await Promise.all([
      this.loadProducts(),
      this.loadUserData()
    ]);
  }

  async loadProducts() {
    try {
      const productCount = await this.contract.getProductCount();
      this.products = [];
      
      for (let i = 1; i <= productCount; i++) {
        try {
          const product = await this.contract.getProduct(i);
          const seller = await this.contract.getProductSeller(i);
          const bidInfo = await this.contract.hightestBidderInfo(i);
          const totalBids = await this.contract.totalBids(i);
          
          this.products.push({
            id: i,
            name: product[1],
            category: product[2],
            imageLink: product[3],
            descLink: product[4],
            auctionStartTime: product[5],
            auctionEndTime: product[6],
            startPrice: product[7],
            status: product[8],
            condition: product[9],
            seller: seller,
            highestBidder: bidInfo[0],
            highestBid: bidInfo[1],
            secondHighestBid: bidInfo[2],
            totalBids: totalBids
          });
        } catch (error) {
          console.warn(`Failed to load product ${i}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      throw error;
    }
  }

  async loadUserData() {
    if (!accounts || !accounts[0]) return;
    
    try {
      // Load user's products (as seller)
      this.userProducts = this.products.filter(p => p.seller === accounts[0]);
      
      // Load user's bids (as buyer) - this would need backend integration for full data
      this.userBids = [];
      
      // Load user's arbitrations
      this.userArbitrations = [];
      for (const product of this.products) {
        if (product.status == 1) { // Sold products have escrow
          try {
            const escrowInfo = await this.contract.escrowInfo(product.id);
            if (escrowInfo[2] === accounts[0]) { // User is arbiter
              this.userArbitrations.push({
                productId: product.id,
                productName: product.name,
                buyer: escrowInfo[0],
                seller: escrowInfo[1],
                fundsDisbursed: escrowInfo[3],
                releaseCount: escrowInfo[4],
                refundCount: escrowInfo[5]
              });
            }
          } catch (error) {
            console.warn(`Failed to load escrow info for product ${product.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      throw error;
    }
  }

  getProducts(filter = {}) {
    let filteredProducts = [...this.products];
    
    if (filter.category) {
      filteredProducts = filteredProducts.filter(p => p.category === filter.category);
    }
    
    if (filter.status) {
      const currentTime = Math.floor(Date.now() / 1000);
      switch (filter.status) {
        case 'active':
          filteredProducts = filteredProducts.filter(p => 
            p.status == 0 && currentTime >= p.auctionStartTime && currentTime < p.auctionEndTime
          );
          break;
        case 'reveal':
          filteredProducts = filteredProducts.filter(p => 
            p.status == 0 && currentTime >= p.auctionEndTime && currentTime < (p.auctionEndTime + 600)
          );
          break;
        case 'finalize':
          filteredProducts = filteredProducts.filter(p => 
            p.status == 0 && currentTime >= (p.auctionEndTime + 600)
          );
          break;
        case 'sold':
          filteredProducts = filteredProducts.filter(p => p.status == 1);
          break;
        case 'unsold':
          filteredProducts = filteredProducts.filter(p => p.status == 2);
          break;
      }
    }
    
    return filteredProducts;
  }

  getUserProducts() {
    return this.userProducts;
  }

  getUserBids() {
    return this.userBids;
  }

  getUserArbitrations() {
    return this.userArbitrations;
  }

  getPendingActions() {
    const pendingActions = [];
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check for products that need bidding
    this.products.forEach(product => {
      if (product.seller !== accounts[0] && 
          product.status == 0 && 
          currentTime >= product.auctionStartTime && 
          currentTime < product.auctionEndTime) {
        pendingActions.push({
          type: 'bid',
          productId: product.id,
          productName: product.name,
          message: `Auction active for ${product.name}`,
          action: `Bid on ${product.name}`
        });
      }
    });
    
    // Check for products that need reveal
    this.products.forEach(product => {
      if (product.seller !== accounts[0] && 
          product.status == 0 && 
          currentTime >= product.auctionEndTime && 
          currentTime < (product.auctionEndTime + 600)) {
        pendingActions.push({
          type: 'reveal',
          productId: product.id,
          productName: product.name,
          message: `Reveal phase for ${product.name}`,
          action: `Reveal bid for ${product.name}`
        });
      }
    });
    
    // Check for arbitrations that need action
    this.userArbitrations.forEach(arbitration => {
      if (!arbitration.fundsDisbursed) {
        pendingActions.push({
          type: 'arbitration',
          productId: arbitration.productId,
          productName: arbitration.productName,
          message: `Arbitration needed for ${arbitration.productName}`,
          action: `Manage arbitration for ${arbitration.productName}`
        });
      }
    });
    
    return pendingActions;
  }

  async getProductDetails(productId) {
    try {
      const product = await this.contract.getProduct(productId);
      const seller = await this.contract.getProductSeller(productId);
      const bidInfo = await this.contract.hightestBidderInfo(productId);
      const totalBids = await this.contract.totalBids(productId);
      
      return {
        id: productId,
        name: product[1],
        category: product[2],
        imageLink: product[3],
        descLink: product[4],
        auctionStartTime: product[5],
        auctionEndTime: product[6],
        startPrice: product[7],
        status: product[8],
        condition: product[9],
        seller: seller,
        highestBidder: bidInfo[0],
        highestBid: bidInfo[1],
        secondHighestBid: bidInfo[2],
        totalBids: totalBids
      };
    } catch (error) {
      console.error('Failed to get product details:', error);
      throw error;
    }
  }

  async getEscrowInfo(productId) {
    try {
      const escrowInfo = await this.contract.escrowInfo(productId);
      return {
        buyer: escrowInfo[0],
        seller: escrowInfo[1],
        arbiter: escrowInfo[2],
        fundsDisbursed: escrowInfo[3],
        releaseCount: escrowInfo[4],
        refundCount: escrowInfo[5],
        totalAmount: escrowInfo[6],
        releaseAmount: escrowInfo[7],
        serviceFee: escrowInfo[8]
      };
    } catch (error) {
      console.error('Failed to get escrow info:', error);
      throw error;
    }
  }
}

// Create global instance
window.dataService = new DataService(); 