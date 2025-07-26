// Network and Error Handling Components

// Network Status Check
function checkNetworkStatus() {
  if (typeof web3 === 'undefined') {
    showError('Web3 is not detected. Please install MetaMask or another Web3 provider.');
    return false;
  }
  
  if (!web3.currentProvider) {
    showError('No Web3 provider detected. Please connect MetaMask.');
    return false;
  }
  
  return true;
}

// Error Handling
function showError(message, duration = 5000) {
  const errorHtml = `
    <div class="alert alert-danger alert-dismissible fade in" role="alert">
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
      <strong>Error:</strong> ${message}
    </div>
  `;
  
  // Remove existing error messages
  $('.alert-danger').remove();
  
  // Add new error message
  $('body').prepend(errorHtml);
  
  // Auto dismiss after duration
  setTimeout(() => {
    $('.alert-danger').fadeOut();
  }, duration);
}

function showSuccess(message, duration = 3000) {
  const successHtml = `
    <div class="alert alert-success alert-dismissible fade in" role="alert">
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
      <strong>Success:</strong> ${message}
    </div>
  `;
  
  // Remove existing success messages
  $('.alert-success').remove();
  
  // Add new success message
  $('body').prepend(successHtml);
  
  // Auto dismiss after duration
  setTimeout(() => {
    $('.alert-success').fadeOut();
  }, duration);
}

// Loading States
function showLoading(element, text = 'Loading...') {
  const loadingHtml = `
    <div class="loading-overlay">
      <div class="loading-spinner">
        <div class="spinner-border text-primary" role="status">
          <span class="sr-only">${text}</span>
        </div>
        <p class="mt-2">${text}</p>
      </div>
    </div>
  `;
  
  $(element).addClass('loading');
  $(element).append(loadingHtml);
}

function hideLoading(element) {
  $(element).removeClass('loading');
  $(element).find('.loading-overlay').remove();
}

// Transaction Status Monitor
function monitorTransaction(txHash, description = 'Transaction') {
  const monitorHtml = `
    <div class="alert alert-info transaction-monitor" role="alert">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${description}:</strong> 
          <span class="tx-hash">${txHash.substring(0, 10)}...</span>
        </div>
        <div class="spinner-border spinner-border-sm" role="status">
          <span class="sr-only">Processing...</span>
        </div>
      </div>
    </div>
  `;
  
  $('body').prepend(monitorHtml);
  
  // Check transaction status
  const checkInterval = setInterval(() => {
    web3.eth.getTransactionReceipt(txHash).then(receipt => {
      if (receipt) {
        clearInterval(checkInterval);
        if (receipt.status) {
          showSuccess(`${description} completed successfully!`);
        } else {
          showError(`${description} failed. Please try again.`);
        }
        $('.transaction-monitor').fadeOut();
      }
    }).catch(err => {
      console.error('Error checking transaction:', err);
    });
  }, 2000);
  
  // Timeout after 5 minutes
  setTimeout(() => {
    clearInterval(checkInterval);
    $('.transaction-monitor').fadeOut();
    showError(`${description} is taking longer than expected. Please check your transaction.`);
  }, 300000);
}

// User Role Validation
function validateUserRole(requiredRole, productId) {
  return new Promise((resolve, reject) => {
    EcommerceStore.deployed().then(ins => {
      ins.getProductSeller(productId).then(seller => {
        const isSeller = seller === accounts[0];
        
        switch(requiredRole) {
          case 'seller':
            if (isSeller) {
              resolve(true);
            } else {
              reject('Only the seller can perform this action.');
            }
            break;
          case 'buyer':
            if (!isSeller) {
              resolve(true);
            } else {
              reject('Sellers cannot perform this action.');
            }
            break;
          case 'arbiter':
            // Check if user is arbiter for this product
            ins.escrowInfo(productId).then(escrowInfo => {
              if (escrowInfo[2] === accounts[0]) {
                resolve(true);
              } else {
                reject('Only the arbiter can perform this action.');
              }
            }).catch(err => {
              reject('Error checking arbiter status.');
            });
            break;
          default:
            resolve(true);
        }
      }).catch(err => {
        reject('Error validating user role.');
      });
    });
  });
}

// IPFS Connection Check
function checkIPFSConnection() {
  return new Promise((resolve, reject) => {
    ipfs.id().then(id => {
      console.log('IPFS connected:', id);
      resolve(true);
    }).catch(err => {
      console.error('IPFS connection failed:', err);
      showError('IPFS connection failed. Please ensure IPFS daemon is running.');
      reject(err);
    });
  });
}

// Account Balance Check
function checkAccountBalance(requiredAmount) {
  return new Promise((resolve, reject) => {
    web3.eth.getBalance(accounts[0]).then(balance => {
      const balanceEth = web3.utils.fromWei(balance, 'ether');
      const requiredEth = web3.utils.fromWei(requiredAmount, 'ether');
      
      if (parseFloat(balanceEth) >= parseFloat(requiredEth)) {
        resolve(true);
      } else {
        reject(`Insufficient balance. Required: ${requiredEth} ETH, Available: ${balanceEth} ETH`);
      }
    }).catch(err => {
      reject('Error checking account balance.');
    });
  });
}

// Form Validation
function validateBidForm(bidAmount, sendAmount, startPrice) {
  const errors = [];
  
  if (!bidAmount || parseFloat(bidAmount) <= 0) {
    errors.push('Bid amount must be greater than 0');
  }
  
  if (!sendAmount || parseFloat(sendAmount) <= 0) {
    errors.push('Send amount must be greater than 0');
  }
  
  if (parseFloat(bidAmount) <= parseFloat(startPrice)) {
    errors.push('Bid amount must be greater than start price');
  }
  
  if (parseFloat(sendAmount) < parseFloat(bidAmount)) {
    errors.push('Send amount must be greater than or equal to bid amount');
  }
  
  return errors;
}

// Export functions for use in other files
window.AppComponents = {
  checkNetworkStatus,
  showError,
  showSuccess,
  showLoading,
  hideLoading,
  monitorTransaction,
  validateUserRole,
  checkIPFSConnection,
  checkAccountBalance,
  validateBidForm
}; 