//execute script when window is loaded
window.onload = setMap();

    function setMap(){
        
        //map frame dimensions
        var width = 960,
            height = 660;
    
        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
    
        //create Albers equal area conic projection centered on the US
        var projection = d3.geoAlbersUsa()   
            .scale(1000)
            .translate([480, 250]);

        var path = d3.geoPath()
            .projection(projection);
    
        //use Promise.all to parallelize asynchronous data loading
        var promises = [];    
        promises.push(d3.csv("data/Demographics.csv")); //load attributes from csv    
        promises.push(d3.json("data/States.topojson")); //load background spatial data    
        Promise.all(promises).then(callback);

        function callback(data){    
            csvData = data[0];    
            states = data[1];     
            console.log(csvData);
            console.log(states);   
            
            //translate States TopoJSON
            var unitedStates = topojson.feature(states, states.objects.States_shapefile);

            //add States to map
            var addingStates = map.append("path")
            .datum(unitedStates)
            .attr("class", "UnitedStates")
            .attr("d", path);

        };
};