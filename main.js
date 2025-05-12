import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// load data functions
async function loadDexcomData() {
    const data = await d3.csv('data/cleaned_data/dexcom.csv', (row) => ({
        ...row,
        timestamp: new Date(row.timestamp),
        value: Number(row.value),
        patient_id: Number(row.patient_id)
    }));

    console.log('First few entries of loaded data:', data.slice(0, 3));
    return data;
}

async function loadFoodLogData() {
    const data = await d3.csv('data/cleaned_data/food_logs.csv', (row) => ({
        ...row,
        timestamp: new Date(row.timestamp),
        value: Number(row.value),
        food: row.food,
        patient_id: Number(row.patient_id)
    }));

    console.log('First few food log entries:', data.slice(0, 3));
    return data;
}

let dexcomData = await loadDexcomData();
let foodLogData = await loadFoodLogData();

/*
Preview of dexcomData:
[
    {
        timestamp: Date,  
        value: 180,      
        patient_id: "123" 
    },
    {
        timestamp: Date,
        value: 165,
        patient_id: "123"
    },
    // ... more entries ...
]
*/

async function loadDemographicsData() {
    const data = await d3.csv('data/demographics.csv', (row) => ({
        ...row,
        patient_id: Number(row.patient_id),
        age: Number(row.age),
        gender: row.gender,
        condition: row.condition
    }));
    return data;
}

//Audrey load data 
function populatePatientDropdown(demographicsData) {
    const select = document.getElementById('patient-select');
    select.innerHTML = '';

    const patientIDs = [...new Set(demographicsData.map(d => d.patient_id))];
    patientIDs.forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `Patient ${id}`;
        select.appendChild(option);
    });

    patient_id = patientIDs[0];
}





// Tooltip visibility
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('food-log-tooltip');
    tooltip.hidden = !isVisible;
}

// Add button click handler for hyperglycemia and hypoglycemia threshold buttons
document.querySelector('#hyperglycemia').addEventListener('click', function() {
    this.classList.toggle('active');
});

document.querySelector('#hypoglycemia').addEventListener('click', function() {
    this.classList.toggle('active');
});


// Tooltip position
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('food-log-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

// Add tooltip functionality
// Shows food, sugar, date, time, and interpolated glucose value, not sure how necessary the interpolated glucose value is.
function renderTooltipContent(food_item) {
    const food = document.getElementById('tooltip-food');
    const sugar = document.getElementById('tooltip-sugar');
    const date = document.getElementById('tooltip-date');
    const time = document.getElementById('tooltip-time');
    const glucose = document.getElementById('tooltip-glucose');

    if (Object.keys(food_item).length === 0) return;

    // Find the closest Dexcom readings before and after this food log entry
    const before = dexcomData.filter(dex => dex.timestamp <= food_item.timestamp).pop();
    const after = dexcomData.filter(dex => dex.timestamp >= food_item.timestamp).shift();
    
    // Interpolate the glucose value at this timestamp
    let interpolatedGlucose = 'N/A';
    if (before && after) {
        const t = (food_item.timestamp - before.timestamp) / (after.timestamp - before.timestamp);
        interpolatedGlucose = Math.round(before.value + t * (after.value - before.value));
    }

    food.textContent = food_item.food;
    sugar.textContent = food_item.value;
    date.textContent = food_item.timestamp?.toLocaleString('en', {
        dateStyle: 'full'
    });
    time.textContent = food_item.timestamp?.toLocaleString('en', {
        timeStyle: 'short'
    });
    glucose.textContent = `${interpolatedGlucose} mg/dL`;
}


const width = 1200; // make sure to adjust width in style.css to match this
const height = 600;
let patient_id = 1; // add selector for patient id in future
let xScale;
let yScale;
function renderLineGraph(dexcomData, foodLogData) {
    // Clear any existing chart
    d3.select('#chart').selectAll('*').remove();

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height])
        .style('overflow', 'visible')
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Filter data to a only the patient_id that is currently selected
    const filteredData = dexcomData.filter(d => d.patient_id === patient_id);
    console.log('Filtered data:', filteredData);
    console.log('Number of filtered points:', filteredData.length);
    console.log('Patient ID being filtered for:', patient_id);

    xScale = d3
        .scaleTime()
        .domain(d3.extent(filteredData, (d) => d.timestamp))
        .range([usableArea.left, usableArea.right])
        .nice();
    
    console.log('X scale domain:', xScale.domain());

    yScale = d3
        .scaleLinear()
        .domain([d3.min(filteredData, d => d.value), d3.max(filteredData, d => d.value)])
        .range([usableArea.bottom, usableArea.top]);
    
    console.log('Y scale domain:', yScale.domain());

    // Add gridlines before the axes so they are underneath
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Create the line
    svg.append("path")
        .datum(filteredData)
        .attr("fill", "none")
        .attr("stroke", "var(--line-color)")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line()
            .x(d => xScale(d.timestamp))
            .y(d => yScale(d.value))
            .curve(d3.curveCatmullRom.alpha(0.5))  // adjustable alpha for smoothing the line
        );


    const filteredFoodData = foodLogData.filter(d => d.patient_id === patient_id);

    // Scale dots by sugar value
    const [minSugar, maxSugar] = d3.extent(filteredFoodData, (d) => d.value);
    const rScale = d3
        .scaleSqrt()
        .domain([minSugar, maxSugar])
        .range([5, 12]);

    const sortedFoodData = d3.sort(filteredFoodData, (d) => -d.value);
    console.log('Sorted sugar values:', sortedFoodData);

    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedFoodData)
        .join('circle')
        .attr('cx', (d) => xScale(d.timestamp))
        .attr('cy', (d) => {
            // Feature to plot points at the y level of the glucose chart so they are on top of the line.
            // Find the closest Dexcom reading before and after this food log entry
            const before = filteredData.filter(dex => dex.timestamp <= d.timestamp).pop();
            const after = filteredData.filter(dex => dex.timestamp >= d.timestamp).shift();
            
            if (!before || !after) return yScale(0); // Fallback if no surrounding points
            
            // Interpolate the glucose value at this timestamp
            const t = (d.timestamp - before.timestamp) / (after.timestamp - before.timestamp);
            const interpolatedValue = before.value + t * (after.value - before.value);
            
            return yScale(interpolatedValue);
        })
        .attr('r', (d) => rScale(d.value))
        .attr('fill', 'var(--dot-color)')
        .style('fill-opacity', 0.8)
        .on('mouseenter', (event, d) => {
            renderTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
            
        })
        .on('mouseleave', () => {
            updateTooltipVisibility(false);
        });
}

/* Ryan's code */
// implement second chart

/* Audrey's code */
//implement patient info

function renderPatientInfo() {
    const infoContainer = document.getElementById('patient-info');
    infoContainer.innerHTML = '';

    const patient = demographicsData.find(d => d.patient_id === patient_id);
    const patientDexData = dexcomData.filter(d => d.patient_id === patient_id);

    if (!patient || patientDexData.length === 0) {
        infoContainer.textContent = 'Patient data not available.';
        return;
    }

    const total = patientDexData.length;
    const hyperCount = patientDexData.filter(d => d.value > 126).length;
    const hypoCount = patientDexData.filter(d => d.value < 70).length;
    const hyperPct = ((hyperCount / total) * 100).toFixed(1);
    const hypoPct = ((hypoCount / total) * 100).toFixed(1);

    infoContainer.innerHTML = `
        <p><strong>Patient ID:</strong> ${patient.patient_id}</p>
        <p><strong>Age:</strong> ${patient.age}</p>
        <p><strong>Gender:</strong> ${patient.gender}</p>
        <p><strong>Condition:</strong> ${patient.condition}</p>
        <p><strong>% Time Hyperglycemic (>126):</strong> ${hyperPct}%</p>
        <p><strong>% Time Hypoglycemic (<70):</strong> ${hypoPct}%</p>
    `;
}
document.getElementById('patient-select').addEventListener('change', (event) => {
    patient_id = Number(event.target.value);
    renderLineGraph(dexcomData, foodLogData);
    renderPatientInfo();
});

// async function initialize() {
//     dexcomData = await loadDexcomData();
//     foodLogData = await loadFoodLogData();
//     demographicsData = await loadDemographicsData();

//     populatePatientDropdown(demographicsData);
//     renderLineGraph(dexcomData, foodLogData);
//     renderPatientInfo();
// }

// initialize();


renderLineGraph(dexcomData, foodLogData);
