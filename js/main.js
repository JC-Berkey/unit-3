(function() { 

    //pseudo-global variables
    var attrArray = ["Population_Percent_Change", "Population.2014", "Age.Percent_Under_18_Years", "Age.Percent_Under_5_Years", "Age.Percent_65_and_Older"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
    chartHeight = 473,
    leftPadding = 25,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 100]);

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //execute script when window is loaded
    window.onload = setMap();

        function setMap(){
            
            //map frame dimensions
            var width = window.innerWidth * 0.5,
            height = 500;
        
            //create new svg container for the map
            var map = d3.select("body")
                .append("svg")
                .attr("class", "map")
                .attr("width", width)
                .attr("height", height);
        
            //create Albers equal area conic projection centered on the US
            var projection = d3.geoAlbers()   
                .scale(900)
                .translate([330, 240]);

            var path = d3.geoPath()
                .projection(projection);
        
            //use Promise.all to parallelize asynchronous data loading
            var promises = [];    
            promises.push(d3.csv("data/Demographics.csv")); //load attributes from csv 
            promises.push(d3.json("data/North_America.topojson")); //load background spatial data    
            promises.push(d3.json("data/United_States.topojson"));  
            Promise.all(promises).then(callback);

            function callback(data){

                var csvData = data[0], countries = data[1], states = data[2]; 
                
                //translate States TopoJSON
                var northAmerica = topojson.feature(countries, countries.objects.North_America),
                unitedStates = topojson.feature(states, states.objects.United_States).features;

                // add north american countries to map
                var addingCountries = map.append("path")
                    .datum(northAmerica)
                    .attr("class", "North_America")
                    .attr("d", path);  

                //join csv data to GeoJSON enumeration units
                unitedStates = joinData(unitedStates, csvData);

                //create the color scale
                var colorScale = makeColorScale(csvData);

                //add enumeration units to the map
                setEnumerationUnits(unitedStates, map, path, colorScale);

                //add coordinated visualization to the map
                setChart(csvData, colorScale);

                createDropdown();

        };
        function joinData(unitedStates, csvData){
            //loop through csv to assign each set of csv attribute values to geojson region
            for (var i=0; i<csvData.length; i++){
                var csvState = csvData[i]; //the current state
                var csvKey = csvState.State_Name; //the CSV primary key

                //loop through geojson regions to find correct region
                for (var a=0; a<unitedStates.length; a++){

                    var geojsonProps = unitedStates[a].properties; //the current state geojson properties
                    var geojsonKey = geojsonProps.State_Name; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey){

                        //assign all attributes and values
                        attrArray.forEach(function(attr){
                            var val = parseFloat(csvState[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
            };
        
            return unitedStates;
        };
        
        function setEnumerationUnits(unitedStates, map, path, colorScale){    

            //add States to map
            var addingStates = map.selectAll(".states") 
                .data(unitedStates)
                .enter()
                .append("path")
                .attr("class", function(d){
                    return "states " + d.properties.State_Name;
                })
                .attr("d", path)
                .style("fill", function(d){            
                    var value = d.properties[expressed];            
                    if(value) {                
                        return colorScale(d.properties[expressed]);            
                    } else {               
                        return "#ccc";        
                    }    
            })
                .on("mouseover", function(event, d){
                    highlight(d.properties);
                })
                .on("mouseout", function(event, d){
                    dehighlight(d.properties);
                })
                .on("mousemove", moveLabel);
                var desc = addingStates.append("desc")
                .text('{"stroke": "#000", "stroke-width": "0.5px"}');
        };
        
        //Example 1.4 line 11...function to create color scale generator
        function makeColorScale(data){
            var colorClasses = [
                "#D4B9DA",
                "#C994C7",
                "#DF65B0",
                "#DD1C77",
                "#980043"
            ];

            //create color scale generator
            var colorScale = d3.scaleQuantile()
                .range(colorClasses);

            //build two-value array of minimum and maximum expressed attribute values
            var minmax = [
                d3.min(data, function(d) { return parseFloat(d[expressed]); }),
                d3.max(data, function(d) { return parseFloat(d[expressed]); })
            ];
            //assign two-value array as scale domain
            colorScale.domain(minmax);

            return colorScale;
        };
        //function to create coordinated bar chart
        function setChart(csvData, colorScale){

            //set bars for each province
            var bars = chart.selectAll(".bar") // could be "bar"
                .data(csvData)
                .enter()
                .append("rect")
                .sort(function(a, b){
                    return b[expressed]-a[expressed]
                })
                .attr("class", function(d){
                    return "bar " + d.State_Name;
                })
                .attr("width", chartInnerWidth / csvData.length - 1)
                .on("mouseover", function(event, d){
                    highlight(d);
                })
                .on("mouseout", function(event, d){
                    dehighlight(d);
                })
                .on("mousemove", moveLabel);
                var desc = bars.append("desc")
                .text('{"stroke": "none", "stroke-width": "0px"}');

            var chartTitle = chart.append("text")
                .attr("x", 30)
                .attr("y", 40)
                .attr("class", "chartTitle")
            
            //create vertical axis generator
            var yAxis = d3.axisLeft()
                .scale(yScale);

            //place axis
            var axis = chart.append("g")
                .attr("class", "axis")
                .attr("transform", translate)
                .call(yAxis);

            //create frame for chart border
            var chartFrame = chart.append("rect")
                .attr("class", "chartFrame")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);

            //set bar positions, heights, and colors
            updateChart(bars, csvData.length, colorScale);
        };

        //function to create a dropdown menu for attribute selection
        function createDropdown(csvData){
            //add select element
            var dropdown = d3.select("body")
                .append("select")
                .attr("class", "dropdown")
                .on("change", function(){
                    changeAttribute(this.value, csvData)
            });

            //add attribute name options
            var attrOptions = dropdown.selectAll("attrOptions")
                .data(attrArray)
                .enter()
                .append("option")
                .attr("value", function(d){ return d })
                .text(function(d){ return d });
        };

        //Example 1.4 line 14...dropdown change event handler
        function changeAttribute(attribute, csvData){
            //change the expressed attribute
            expressed = attribute;

            //recreate the color scale
            var colorScale = makeColorScale(csvData);

            //recolor enumeration units
            var states = d3.selectAll(".states")
                .transition()
                .duration(1000)
                .style("fill", function(d){            
                    var value = d.properties[expressed];            
                    if(value) {                
                        return colorScale(value);           
                    } else {                
                        return "#ccc";            
                    }    
                });
            //Sort, resize, and recolor bars
            var bars = d3.selectAll(".bar")
                //Sort bars
                .sort(function(a, b){
                    return b[expressed] - a[expressed];
                })
                .transition() //add animation
                .delay(function(d, i){
                    return i * 20
                })
                .duration(500);

            updateChart(bars, csvData.length, colorScale);
        };

        //function to position, size, and color bars in chart
        function updateChart(bars, n, colorScale){
            //position bars
            bars.attr("x", function(d, i){
                    return i * (chartInnerWidth / n) + leftPadding;
                })
                //size/resize bars
                .attr("height", function(d, i){
                    return 463 - yScale(parseFloat(d[expressed]));
                })
                .attr("y", function(d, i){
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
                })
                //color/recolor bars
                .style("fill", function(d){            
                    var value = d[expressed];            
                    if(value) {                
                        return colorScale(value);            
                    } else {                
                        return "#ccc";            
                    }   
            });
                var chartTitle = d3.select(".chartTitle")
                    .text(expressed + " in each state (2020)"); 
        };

        //function to highlight enumeration units and bars
        function highlight(props){
            //change stroke
            var selected = d3.selectAll("." + props.State_Name)
                .style("stroke", "blue")
                .style("stroke-width", "2");
            setLabel(props);
        };

        //function to reset the element style on mouseout
        function dehighlight(props){
            var selected = d3.selectAll("." + props.State_Name)
                .style("stroke", function(){
                    return getStyle(this, "stroke")
                })
                .style("stroke-width", function(){
                    return getStyle(this, "stroke-width")
                });

            function getStyle(element, styleName){
                var styleText = d3.select(element)
                    .select("desc")
                    .text();

                var styleObject = JSON.parse(styleText);

                return styleObject[styleName];
            };
            d3.select(".infolabel")
                .remove();
        };

        //function to create dynamic label
        function setLabel(props){
            //label content
            var labelAttribute = "<h1>" + props[expressed] +
                "</h1><b>" + expressed + "</b>";

            //create info label div
            var infolabel = d3.select("body")
                .append("div")
                .attr("class", "infolabel")
                .attr("id", props.State_Name + "_label")
                .html(labelAttribute);

            var stateName = infolabel.append("div")
                .attr("class", "labelname")
                .html(props.State_Name);
        };

        //Example 2.8 line 1...function to move info label with mouse
        function moveLabel(){
            //get width of label
            var labelWidth = d3.select(".infolabel")
                .node()
                .getBoundingClientRect()
                .width;

            //use coordinates of mousemove event to set label coordinates
            var x1 = event.clientX + 10,
                y1 = event.clientY - 75,
                x2 = event.clientX - labelWidth - 10,
                y2 = event.clientY + 25;

            //horizontal label coordinate, testing for overflow
            var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
            //vertical label coordinate, testing for overflow
            var y = event.clientY < 75 ? y2 : y1; 

            d3.select(".infolabel")
                .style("left", x + "px")
                .style("top", y + "px");
        };
    };

})();