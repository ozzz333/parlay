// Coins and Setup
const coins = ["bitcoin", "ethereum", "solana", "binancecoin", "cardano", "dogecoin"];
const coinSymbols = {
    bitcoin: "BTC",
    ethereum: "ETH",
    solana: "SOL",
    binancecoin: "BNB",
    cardano: "ADA",
    dogecoin: "DOGE"
};

const CORRELATION_DISCOUNT = 0.9; // 10% odds reduction
const RECEIVER_WALLET = "YOUR_DEVNET_RECEIVER_PUBLIC_KEY_HERE"; // <<== SET THIS!
const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');

let livePrices = {};

// 1. Fetch live prices
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
    }
}

// 2. Build coin inputs
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

// 3. Calculate odds
function calculateOdds(currentPrice, targetPrice, timeframe) {
    if (targetPrice <= currentPrice) return 1.5;
    const difficulty = (targetPrice - currentPrice) / currentPrice;
    let baseOdds = 2 + difficulty * 10;

    let multiplier = 1.0;
    if (timeframe === "1 Day") multiplier = 1.5;
    if (timeframe === "3 Days") multiplier = 1.3;
    if (timeframe === "7 Days") multiplier = 1.1;
    if (timeframe === "30 Days") multiplier = 1.0;

    return Math.max(1.5, Math.min(baseOdds * multiplier, 50));
}

// 4. Dynamic margin based on asset + timeframe
function getMarginForAssetAndTimeframe(symbol, timeframe) {
    let baseMargin = 0.005; // BTC base = 0.5%

    let marketCapMultiplier = 1.0;

    switch (symbol) {
        case "BTC":
            marketCapMultiplier = 1.0;
            break;
        case "ETH":
            marketCapMultiplier = 1.2;
            break;
        case "BNB":
            marketCapMultiplier = 1.4;
            break;
        case "SOL":
            marketCapMultiplier = 2.0;
            break;
        case "ADA":
            marketCapMultiplier = 2.4;
            break;
        case "DOGE":
            marketCapMultiplier = 3.0;
            break;
        default:
            marketCapMultiplier = 2.0;
    }

    let margin = baseMargin * marketCapMultiplier;

    switch(timeframe) {
        case "1 Day": return margin * 0.7;
        case "3 Days": return margin * 0.85;
        case "7 Days": return margin;
        case "30 Days": return margin * 1.3;
        default: return margin;
    }
}

// 5. Confirm Bet Logic
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
                    ${e.coin} must land between 
                    <strong>$${e.lowerBound.toFixed(2)}</strong> and 
                    <strong>$${e.upperBound.toFixed(2)}</strong> 
                    (Margin ±${(e.margin * 100).toFixed(2)}%) in ${e.timeframe}
                    — Odds: <strong>${e.odds.toFixed(2)}x</strong>
                </li>
            `).join('')}
        </ul>
        <p><strong>Raw Combined Odds:</strong> ${combinedOdds.toFixed(2)}x</p>
        <p><strong>After Correlation Discount:</strong> ${adjustedOdds.toFixed(2)}x</p>
    `;

    document.getElementById('potential-payout').innerHTML = `<h4>Potential Payout: $${potentialPayout.toFixed(2)}</h4>`;

    // 👇 New: Trigger Transaction after confirming parlay
    const parlaySummary = selectedEvents.map(e => `${e.coin}:${e.target}`).join(', ') + ` | ${timeframe}`;
    await placeBetTransaction(parlaySummary);
});

// 6. Send real Solana transaction
async function placeBetTransaction(parlaySummary) {
    if (window.solana && window.solana.isPhantom) {
        try {
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

            alert(`✅ Bet placed successfully!\nTx ID: ${signature}`);
            window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank');

        } catch (err) {
            console.error('Transaction failed', err);
            alert('❌ Bet failed or rejected.');
        }
    } else {
        alert('Phantom Wallet not found.');
    }
}

// 7. Wallet Connect
document.getElementById('connect-wallet').addEventListener('click', async () => {
    if (window.solana && window.solana.isPhantom) {
        try {
            const resp = await window.solana.connect();
            document.getElementById('wallet-address').innerText = `Wallet: ${resp.publicKey.toString().slice(0, 6)}...${resp.publicKey.toString().slice(-4)}`;
        } catch (err) {
            console.error('Wallet connection rejected.');
        }
    } else {
        alert('Phantom Wallet not found.');
    }
});

// 8. Launch App
fetchPrices();
