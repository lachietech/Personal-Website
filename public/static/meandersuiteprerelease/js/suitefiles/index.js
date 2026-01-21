document.getElementById('refresh-btn').addEventListener('click', () => {
    getCWIS(); // if your CWIS loader is named that
});
document.addEventListener('DOMContentLoaded', getCWIS);
async function getCWIS() {
    try {
        const response = await fetch('/meandersuite/suite/suitedata');
        const data = await response.json();
        function getcolor() {
            if (data.score >= 85) return "rgba(0, 200, 0, 0.8)";
            else if (data.score >= 70) return "rgba(100, 200, 0, 0.8)";
            else if (data.score >= 55) return "rgba(200, 200, 0, 0.8)";
            else if (data.score >= 40) return "rgba(255, 140, 0, 0.8)";
            else if (data.score >= 25) return "rgba(255, 60, 0, 0.8)";
            else if (data.score >= 0) return "rgba(200, 0, 0, 0.8)";
            else return "rgba(120, 0, 0, 0.8)";
        }
        document.querySelector('body').style.backgroundColor = getcolor();
        document.getElementById('temperature').innerText = `${data.temp} °C`;
        document.getElementById('humidity').innerText = `${data.humidity} %`;
        document.getElementById('cloudCoverage').innerText = `${data.cloud} %`;
        document.getElementById('UV').innerText = `${data.uv} UV`;
        document.getElementById('windSpeed').innerText = `${data.wind} KM/H`;
        document.getElementById('rain').innerText = `${data.precip} MM`;
        document.getElementById('severity').innerText = `CWIS Score: ${data.score}/100`;
        document.getElementById('rating').innerText = `Rating: ${data.Mood}`;
        document.getElementById('behaviors').innerText = `Expected Behaviours: ${data.Behaviour}`;
        document.getElementById('notes').innerText = `${data.Notes}`;
    } catch (err) {
        console.error('Fetch failed:', err);
        document.getElementById('hi').innerHTML = 'Error fetching CWIS.';
    }
}