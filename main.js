import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// load data functions
async function loadDexcomData() {
    const data = await d3.csv('data/cleaned_data/dexcom.csv', (row) => ({
        ...row,
        timestamp: new Date(row.timestamp),
        value: Number(row.value),
        patient_id: row.patient_id
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










// render scatter plot function, ripped from lab 6, which will be modified to fit the dexcom and food log data as a line graph. (probably)
const width = 1000;
const height = 600;
let xScale;
let yScale;
function renderLinegraph(dexcomData) {

    const svg = d3
        .select('#chart')
        .attr('width', width)
        .attr('height', height)
        .append('svg')
        .attr('viewBox', [0, 0, width, height])
        .style('overflow', 'visible');

    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale = d3
        .scaleTime()
        .domain(d3.extent(dexcomData, (d) => new d.timestamp))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([30, 180])
        .range([usableArea.bottom, usableArea.top]);

    // Add gridlines BEFORE the axes
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Scale dots based on lines edited
    /*
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([5, 12]); // set dot size based on lines edited
    

    // Sort commits by total lines in descending order (so smaller dots are on top and can be hovered over)
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => {
            const date = new Date(d.datetime);
            date.setHours(12, 0, 0, 0);
            return xScale(date);
        })
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'var(--color-accent)')
        .style('fill-opacity', 0.8) // transparency for overlapping dots
        .style('cursor', 'pointer') // show pointer cursor on hover
        .on('mouseenter', (event, commit) => {
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            updateTooltipVisibility(false);
        })
        
    */

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

}

renderLineGraph(dexcomData);
