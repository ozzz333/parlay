body {
    background: linear-gradient(to right, #0f2027, #203a43, #2c5364);
    font-family: 'Poppins', sans-serif;
    color: #ffffff;
    margin: 0;
    padding: 0;
}

header {
    background-color: #141414;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

nav a {
    margin: 0 10px;
    color: #00f2ff;
    text-decoration: none;
}

.hero {
    text-align: center;
    padding: 3rem 1rem;
    background: linear-gradient(90deg, #00f2ff, #cfff04, #ff48c4);
    color: #141414;
}

.build-parlay {
    padding: 2rem;
    background-color: #1a1a1a;
    margin: 2rem;
    border-radius: 12px;
}

.event {
    margin-bottom: 2rem;
}

input[type="number"], select {
    padding: 0.5rem;
    margin-top: 0.5rem;
    width: 100%;
    border-radius: 8px;
    border: none;
    outline: none;
    font-size: 1rem;
}

button {
    background-color: #ff48c4;
    color: #141414;
    border: none;
    padding: 1rem 2rem;
    margin-top: 1rem;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    border-radius: 10px;
    transition: background 0.3s;
}

button:hover {
    background-color: #cfff04;
}

#parlay-summary, #potential-payout {
    margin-top: 2rem;
    background: #333;
    padding: 1rem;
    border-radius: 10px;
}
