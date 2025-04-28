// Constants
const coins = ["bitcoin", "ethereum", "solana", "binancecoin", "cardano", "dogecoin"];
const coinSymbols = {
    bitcoin: "BTC",
    ethereum: "ETH",
    solana: "SOL",
    binancecoin: "BNB",
    cardano: "ADA",
    dogecoin: "DOGE"
};

const CORRELATION_DISCOUNT = 0.9;
const RECEIVER_WALLET = "YOUR_DEVNET_RECEIVER_PUBLIC_KEY_HERE"; // ⚡ Replace this!
const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');

let livePrices = {};

// Modal Elements
const modal = document.getElementById('success-modal');
const closeModalBtn = document.getElementById('close-modal');
const txIdElement = document.getElementById('tx-id');
const copyTxButton = document.getElementById('copy-tx');
const explorerLink = document.getElementById('explorer-link');
const loadingSpinner = document.getElementById('loading-spinner');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');

// Modal Functions
function showLoadingModal() {
    modalTitle.innerText = "Placing Bet...";
    modalMessage.innerText = "Waiting for transaction confirmation...";
    txIdElement.innerText = "";
    explorerLink.href = "#";
    loadingSpinner.classList.remove('hidden');
    copyTxButton.classList.add('hidden');
    explorerLink.classList.add('hidden');

    modal.classList.add('show');
    modal.classList.remove('hidden');
}

function showSuccessModal(signature) {
    loadingSpinner.classList.add('hidden');
    modalTitle.innerText = "✅ Bet Placed Successfully!";
    modalMessage.innerText = "Transaction ID:";
    txIdElement.innerText = signature;
    explorerLink.href = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    explorerLink.classList.remove('hidden');
    copyTxButton.classList.remove('hidden');

    setTimeout(() => {
        closeSuccessModal();
    }, 5000);
}

function showErrorModal(message) {
    loadingSpinner.classList.add('hidden');
    modalTitle.innerText = "❌ Bet Failed!";
    modalMessage.innerText = message;
    txIdElement.innerText = "";
    explorerLink.classList.add('hidden');
    copyTxButton.classList.add('hidden');

    modal.classList.add('show');
    modal.classList.remove('hidden');

    setTimeout(() => {
        closeSuccessModal();
    }, 5000);
}

function closeSuccessModal() {
    modal.classList.remove('show');
    modal.classList.add('hidden');
}

closeModalBtn.addEventListener('click', closeSuccessModal);
copyTxButton.addEventListener('click', () => {
    navigator.clipboard.writeText(txIdElement.innerText);
    copyTxButton.innerText = 'Copied!';
    setTimeout(() => {
        copyTxButton.innerText = 'Copy Tx ID';
    }, 2000);
});

// Fetch live prices
async function fetchPrices() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,cardano,dogecoin&vs_currencies=usd');
        const data = await response.json();
        livePrices = {
            BTC: data.bitcoin.usd,
            ETH: data.ethereum.usd,
            SOL: data.solana.usd,
            BNB: data.binancecoin.usd,
            ADA: data.cardano.usd,
            DOGE: data.dogecoin.usd
        };
        buildEventInputs();
    } catch (error) {
        console.error("Error fetching prices:", error);
        showErrorModal("Failed to load prices.");
    }
}

// Build price target input fields
function buildEventInputs() {
    const eventsDiv = document.getElementById('events');
    eventsDiv.innerHTML = "";

    for (const [symbol, price] of Object.entries(livePrices)) {
        const container = document.createElement('div');
        container.className = 'event';

        const label = document.createElement('label');
        label.innerText = `${symbol} Target ($${price}):`;

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `${symbol}-target`;
        input.placeholder = "Target Price";

        container.appendChild(label);
        container.appendChild(input);
        eventsDiv.appendChild(container);
    }
}

// Correct Odds Calculation (Up or Down)
function calculateOdds(currentPrice, targetPrice, timeframe) {
    const difficulty = Math.abs(targetPrice - currentPrice) / currentPrice;
    let baseOdds = 2 + difficulty * 10;

    let multiplier = 1.0;
    if (timeframe === "1 Day") multiplier = 1.5;
    if (timeframe === "3 Days") multiplier = 1.3;
    if (timeframe === "7 Days") multiplier = 1.1;
    if (timeframe === "30 Days") multiplier = 1.0;

    return Math.max(1.5, Math.min(baseOdds * multiplier, 50));
}

// Dynamic Margin based on Asset + Timeframe
function getMarginForAssetAndTimeframe(symbol, timeframe) {
    let baseMargin = 0.005; // BTC = 0.5%

    let marketCapMultiplier = 1.0;
    switch (symbol) {
        case "BTC": marketCapMultiplier = 1.0; break;
        case "ETH": marketCapMultiplier = 1.2; break;
        case "BNB": marketCapMultiplier = 1.4; break;
        case "SOL": marketCapMultiplier = 2.0; break;
        case "ADA": marketCapMultiplier = 2.4; break;
        case "DOGE": marketCapMultiplier = 3.0; break;
        default: marketCapMultiplier = 2.0;
    }

    let margin = baseMargin * marketCapMultiplier;

    switch (timeframe) {
        case "1 Day": return margin * 0.7;
        case "3 Days": return margin * 0.85;
        case "7 Days": return margin;
        case "30 Days": return margin * 1.3;
        default: return margin;
    }
}

// Confirm Bet Click
document.getElementById('confirm-bet').addEventListener('click', async () => {
    let selectedEvents = [];
    const timeframe = document.getElementById('global-timeframe').value;

    for (const symbol of Object.keys(livePrices)) {
        const targetInput = document.getElementById(`${symbol}-target`);
        const target = parseFloat(targetInput.value);
        if (!isNaN(target)) {
            const margin = getMarginForAssetAndTimeframe(symbol, timeframe);
            const lowerBound = target * (1 - margin);
            const upperBound = target * (1 + margin);
            const odds = calculateOdds(livePrices[symbol], target, timeframe);

            selectedEvents.push({
                coin: symbol,
                target,
                lowerBound,
                upperBound,
                margin,
                timeframe,
                odds
            });
        }
    }

    const errorMessage = document.getElementById('error-message');
    if (selectedEvents.length < 3) {
        errorMessage.innerText = "⚠️ Please select at least 3 coins!";
        document.getElementById('parlay-summary').innerHTML = "";
        document.getElementById('potential-payout').innerHTML = "";
        return;
    } else {
        errorMessage.innerText = "";
    }

    const betAmount = parseFloat(document.getElementById('bet-amount').value) || 0;
    const combinedOdds = selectedEvents.reduce((total, e) => total * e.odds, 1);
    const adjustedOdds = combinedOdds * CORRELATION_DISCOUNT;
    const potentialPayout = betAmount * adjustedOdds;

    document.getElementById('parlay-summary').innerHTML = `
        <h4>Your Parlay:</h4>
        <ul>
            ${selectedEvents.map(e => `
                <li>
                    ${e.coin} between <strong>$${e.lowerBound.toFixed(2)}</strong> - <strong>$${e.upperBound.toFixed(2)}</strong> (±${(e.margin * 100).toFixed(2)}%) — <strong>${e.odds.toFixed(2)}x</strong>
                </li>
            `).join('')}
        </ul>
        <p><strong>Raw Odds:</strong> ${combinedOdds.toFixed(2)}x</p>
        <p><strong>After Correlation:</strong> ${adjustedOdds.toFixed(2)}x</p>
    `;

    document.getElementById('potential-payout').innerHTML = `<h4>Potential Payout: $${potentialPayout.toFixed(2)}</h4>`;

    const parlaySummary = selectedEvents.map(e => `${e.coin}:${e.target}`).join(', ') + ` | ${timeframe}`;
    await placeBetTransaction(parlaySummary);
});

// Place Transaction to Solana Devnet
async function placeBetTransaction(parlaySummary) {
    if (window.solana && window.solana.isPhantom) {
        try {
            showLoadingModal();

            const fromWallet = window.solana.publicKey;
            const transaction = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: fromWallet,
                    toPubkey: new solanaWeb3.PublicKey(RECEIVER_WALLET),
                    lamports: solanaWeb3.LAMPORTS_PER_SOL * 0.001
                }),
                new solanaWeb3.TransactionInstruction({
                    keys: [],
                    programId: new solanaWeb3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
                    data: Buffer.from(parlaySummary)
                })
            );

            transaction.feePayer = fromWallet;
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;

            const signed = await window.solana.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(signature);

            showSuccessModal(signature);

        } catch (err) {
            console.error('Transaction failed:', err);
            showErrorModal("Transaction failed or rejected.");
        }
    } else {
        showErrorModal("Phantom Wallet not found.");
    }
}

// Wallet Connect Button
document.getElementById('connect-wallet').addEventListener('click', async () => {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();
            document.getElementById('wallet-address').innerText = `Wallet: ${resp.publicKey.toString().slice(0, 6)}...${resp.publicKey.toString().slice(-4)}`;
        } catch (err) {
            console.error('Wallet connection rejected.');
        }
    } else {
        showErrorModal("Phantom Wallet not found.");
    }
});

// Initialize App
fetchPrices();
