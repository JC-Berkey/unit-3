(function() { 

    //pseudo-global variables
    var attrArray = ["varA", "varB", "varC", "varD", "varE"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute
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
            var projection = d3.geoAlbersUsa()   
                .scale(1000)
                .translate([380, 240]);

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
                setEnumerationUnits(unitedStates, map, path);

                //add coordinated visualization to the map
                setChart(csvData, colorScale);

        };
        function joinData(unitedStates, csvData){
            //loop through csv to assign each set of csv attribute values to geojson region
            for (var i=0; i<csvData.length; i++){
                var csvRegion = csvData[i]; //the current region
                var csvKey = csvRegion.State_Code; //the CSV primary key

                //loop through geojson regions to find correct region
                for (var a=0; a<unitedStates.length; a++){

                    var geojsonProps = unitedStates[a].properties; //the current region geojson properties
                    var geojsonKey = geojsonProps.State_Code; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey){

                        //assign all attributes and values
                        attrArray.forEach(function(attr){
                            var val = parseFloat(csvRegion[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
            };
        
            return unitedStates;
        };
        
        function setEnumerationUnits(unitedStates, map, path){                                                      // TODO Somehow make states appear (enumerated)
            //add States to map
            var addingStates = map.selectAll(".states") // figure out how to select all of the states
            .datum(unitedStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.State_Code;
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];            
                if(value) {                
                    return colorScale(d.properties[expressed]);            
                } else {                
                    return "#ccc";            
                }  
            });
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
            //chart frame dimensions
            var chartWidth = window.innerWidth * 0.425,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

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
            
            //create a scale to size bars proportionally to frame and for axis
            var yScale = d3.scaleLinear()
                .range([463, 0])
                .domain([0, 100]);

            //set bars for each province
            var bars = chart.selectAll(".bars")
                .data(csvData)
                .enter()
                .append("rect")
                .sort(function(a, b){
                    return b[expressed]-a[expressed]
                })
                .attr("class", function(d){
                    return "bar " + d.State_Code;
                })
                .attr("width", chartInnerWidth / csvData.length - 1)
                .attr("x", function(d, i){
                    return i * (chartInnerWidth / csvData.length) + leftPadding;
                })
                .attr("height", function(d, i){
                    return 463 - yScale(parseFloat(d[expressed]));
                })
                .attr("y", function(d, i){
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
                })
                .style("fill", function(d){
                    return colorScale(d[expressed]);
                });

            var chartTitle = chart.append("text")
                .attr("x", 30)
                .attr("y", 40)
                .attr("class", "chartTitle")
                .text("Number of Variable " + expressed[3] + " in each state");
            
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
        };
    };

})();