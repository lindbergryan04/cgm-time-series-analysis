import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// load data functions
async function loadDexcomData() { /* for line graph */
    const data = await d3.csv('data/cleaned_data/dexcom.csv', (row) => ({
        ...row,
        timestamp: new Date(row.timestamp),
        value: Number(row.value),
        patient_id: Number(row.patient_id)
    }));

    console.log('First few entries of loaded data:', data.slice(0, 3));
    return data;
}

async function loadFoodLogData() { /* for line graph */
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

async function loadAggregateData() { /* for aggregate graph */
    const data = await d3.csv('data/cleaned_data/dexcom_aggregate.csv', (row) => ({
        ...row,
        timestamp: new Date(row.timestamp),
        value: Number(row.value),
        patient_id: Number(row.patient_id),
        gender: row.Gender,
        HbA1c: Number(row.HbA1c)
    }));

    console.log('First few aggregate entries:', data.slice(0, 3));
    return data;
}

async function loadDemographicsData() {
    const data = await d3.csv('data/Demographics.csv', (row) => ({
        patient_id: Number(row.ID),
        gender: row.Gender,
        hba1c: Number(row.HbA1c)
    }));
    return data;
}

let dexcomData = await loadDexcomData();
let foodLogData = await loadFoodLogData();
let aggregateData = await loadAggregateData();
let demographicsData = await loadDemographicsData();


let patient_id = 1
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
    select.value = patient_id; // Ensure dropdown reflects the selected patient
    renderPatientInfo();       // <-- Fix: ensure info shows immediately
}

populatePatientDropdown(demographicsData);

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

// TODO: Shriya: add dropdown menu for patient id 
// remember to call renderLineGraph() after changing patient_id.

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

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(filteredData, (d) => d.timestamp))
        .range([usableArea.left, usableArea.right])
        .nice();
    
    const yScale = d3
        .scaleLinear()
        .domain([d3.min(filteredData, d => d.value), d3.max(filteredData, d => d.value)])
        .range([usableArea.bottom, usableArea.top]);
    
    // Add gridlines before the axes so they are underneath
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    // Add title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", usableArea.left)
        .attr("y", margin.top)
        .attr("dy", "-0.5em")
        .text(`Daily Glucose Levels for Patient ${patient_id}`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Add X axis
    svg
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add X axis label
    svg.append("text")
        .attr("class", "x-axis-label")
        .attr("x", usableArea.left + usableArea.width / 2)
        .attr("y", height - 10)
        .style("text-anchor", "middle")
        .text("Time");

    // Add Y axis
    svg
        .append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Add Y axis label
    svg.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -usableArea.top - usableArea.height / 2)
        .attr("y", 20)
        .style("text-anchor", "middle")
        .text("Glucose (mg/dL)");

    // Create the line
    svg.append("path")
        .attr("class", "glucose-line individual-patient-line")
        .datum(filteredData)
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

        let hyperVisible = false;
        let hypoVisible = false;
        
        document.querySelector('#hyperglycemia').addEventListener('click', function () {
          hyperVisible = !hyperVisible;
        
          if (hyperVisible) {
            svg.append('rect')
              .attr('id', 'hyperglycemia-zone')
              .attr('x', usableArea.left)
              .attr('y', usableArea.top)
              .attr('width', usableArea.width)
              .attr('height', 130)
              .attr('fill', '#ffa3a3cc')
              .style('opacity', 0.3);
          } else {
            svg.select('#hyperglycemia-zone').remove();
          }
        
          this.classList.toggle('active', hyperVisible);
        });
        
        document.querySelector('#hypoglycemia').addEventListener('click', function () {
          hypoVisible = !hypoVisible;
        
          if (hypoVisible) {
            svg.append('rect')
              .attr('id', 'hypoglycemia-zone')
              .attr('x', usableArea.left)
              .attr('y', 490)
              .attr('width', usableArea.width)
              .attr('height', 70)
              .attr('fill', '#9fd4ffcc')
              .style('opacity', 0.3);
          } else {
            svg.select('#hypoglycemia-zone').remove();
          }
        
          this.classList.toggle('active', hypoVisible);
        });
}

/* Ryan's code */

function renderAggregateGraph(aggregateData) {
    // Clear any existing chart
    d3.select('#aggregate-chart').selectAll('*').remove();

    const svg = d3
        .select('#aggregate-chart')
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

    // Filter data based on current selections
    function getFilteredData(windowSize = 30) { // windowSize is the number of points to average
        let filtered = aggregateData;
        
        // Apply gender filter if active
        if (document.querySelector('#male').classList.contains('active')) {
            filtered = filtered.filter(d => d.gender === 'MALE');
        } else if (document.querySelector('#female').classList.contains('active')) {
            filtered = filtered.filter(d => d.gender === 'FEMALE');
        }
        
        // Apply HbA1c filter if active
        if (document.querySelector('#low-a1c').classList.contains('active')) {
            filtered = filtered.filter(d => d.HbA1c < 5.7);
        } else if (document.querySelector('#high-a1c').classList.contains('active')) {
            filtered = filtered.filter(d => d.HbA1c >= 5.7);
        }

        // Get the start time of the first day
        const startTime = d3.min(filtered, d => d.timestamp);
        // Calculate the end of day 9 (9 days after start) this removes outlier patients who had their data recorded for longer.
        const endTime = new Date(startTime.getTime() + (9 * 24 * 60 * 60 * 1000));
        
        // Filter to only include first 9 days
        filtered = filtered.filter(d => d.timestamp <= endTime);

        // Group data by timestamp and calculate mean value
        const groupedData = d3.group(filtered, d => d.timestamp);
        const meanData = Array.from(groupedData, ([timestamp, values]) => ({
            timestamp: timestamp,
            value: d3.mean(values, d => d.value)
        }));

        // Sort by timestamp
        const sortedData = meanData.sort((a, b) => a.timestamp - b.timestamp);

        // Calculate rolling mean
        const rollingMeanData = sortedData.map((d, i) => {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(sortedData.length, i + Math.floor(windowSize / 2) + 1);
            const window = sortedData.slice(start, end);
            return {
                timestamp: d.timestamp,
                value: d3.mean(window, x => x.value)
            };
        });

        return rollingMeanData;
    }

    // Create scales and update visualization
    function updateScales() {
        const currentData = getFilteredData();
        
        const xScale = d3
            .scaleTime()
            .domain(d3.extent(currentData, (d) => d.timestamp))
            .range([usableArea.left, usableArea.right])
            .nice();
        
        const yScale = d3
            .scaleLinear()
            .domain([70, 170])  // Fixed domain instead of calculating from data
            .range([usableArea.bottom, usableArea.top]);
        
        // Add gridlines
        const gridlines = svg
            .append('g')
            .attr('class', 'gridlines')
            .attr('transform', `translate(${usableArea.left}, 0)`);

        gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

        // Create and add axes
        svg
            .append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${usableArea.bottom})`)
            .call(d3.axisBottom(xScale)
                .ticks(9)  // Show 9 ticks for 9 days
                .tickFormat(d => `Day ${Math.floor((d - xScale.domain()[0]) / (24 * 60 * 60 * 1000)) + 1}`)
            );

        // Add X axis label
        svg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", usableArea.left + usableArea.width / 2)
            .attr("y", height - 10)
            .style("text-anchor", "middle")
            .text("Time (Days)");

        svg
            .append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(${usableArea.left}, 0)`)
            .call(d3.axisLeft(yScale));

        // Add Y axis label
        svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -usableArea.top - usableArea.height / 2)
            .attr("y", 20)
            .style("text-anchor", "middle")
            .text("Glucose (mg/dL)");

        // Create the line
        svg.append("path")
            .attr("class", "glucose-line aggregate-line")
            .attr("fill", "none")
            .attr("stroke", "var(--line-color)")
            .attr("stroke-width", 0.75)
            .datum(currentData)
            .attr("d", d3.line()
                .x(d => xScale(d.timestamp))
                .y(d => yScale(d.value))
                .curve(d3.curveCatmullRom.alpha(0.5))
            );

        // Add a title to show what's being displayed
        const activeFilters = [];
        if (document.querySelector('#male').classList.contains('active')) activeFilters.push('Male');
        if (document.querySelector('#female').classList.contains('active')) activeFilters.push('Female');
        if (document.querySelector('#low-a1c').classList.contains('active')) activeFilters.push('Low HbA1c');
        if (document.querySelector('#high-a1c').classList.contains('active')) activeFilters.push('High HbA1c');
        
        const filterText = activeFilters.length > 0 ? activeFilters.join(', ') : 'All Patients';
        
        svg.append("text")
            .attr("class", "aggregate-chart-title")
            .attr("x", usableArea.left)
            .attr("y", margin.top)
            .attr("dy", "-0.5em")
            .text(`Average Glucose Over Time (${filterText})`);
        }

    // Add click handlers for the filter buttons
    document.querySelectorAll('.filter-button').forEach(button => {
        button.addEventListener('click', function() {
            const buttonId = this.id;
            
            // Handle gender filters
            if (buttonId === 'male' || buttonId === 'female') {
                if (this.classList.contains('active')) {
                    this.classList.remove('active');
                } else {
                    document.querySelector('#male').classList.remove('active');
                    document.querySelector('#female').classList.remove('active');
                    this.classList.add('active');
                }
            }
            // Handle HbA1c filters
            else if (buttonId === 'low-a1c' || buttonId === 'high-a1c') {
                if (this.classList.contains('active')) {
                    this.classList.remove('active');
                } else {
                    document.querySelector('#low-a1c').classList.remove('active');
                    document.querySelector('#high-a1c').classList.remove('active');
                    this.classList.add('active');
                }
            }
            
            // Clear existing visualization
            svg.selectAll('*').remove();
            // Update the visualization
            updateScales();
        });
    });

    // Initial render
    updateScales();
}

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
  <h2>Patient Overview</h2>
  <p><span>Patient ID:</span><strong>${patient.patient_id}</strong></p>
  <p><span>Gender:</span><strong>${patient.gender}</strong></p>
  <p><span>Prediabetic::</span><strong>${patient.hba1c > 5.7 ? 'Yes' : 'No'}</strong></p>
  <p><span>% Time Hyperglycemic (>126):</span><strong>${hyperPct}%</strong></p>
  <p><span>% Time Hypoglycemic (<70):</span><strong>${hypoPct}%</strong></p>
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
renderAggregateGraph(aggregateData);
