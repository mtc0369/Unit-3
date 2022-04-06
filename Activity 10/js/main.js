
//anonymous function to wrap script
(function(){

    //pseudo-global variables
    var attrArray = ["y1970s_change", "y1980s_change", "y1990s_change", "y2000s_change", "y2010s_change"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute
    
    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //create map frame
        var width = 960,
            height = 460;

        //create svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)
            //.style("background-color", "rgba(0,109,44,0.5)");

        //projection generator - create Albers equal area projection centered on WI
        var projection = d3.geoAlbers()
            .center([0, 44.6])//long, lat
            .rotate([90, 0, 0])//long, lat, angle
            .parallels([42, 46])//2 lats specific to a conic projection
            .scale(5500)//pixel scale/zoom level - converts projection to pixel value
            //.translate([width / 2, height / 2]);//moves map to be half width and height of map frame - doesn't seem necessary if adjustments made in .center

        //define path with generator - converts projection into usable object
        var path = d3.geoPath()
            .projection(projection);//only takes 1 parameter

        //use Promise.all to parallelize asynchronous data loading       
        var promises = [d3.csv("data/NRHP_List_Wisconsin_Final.csv"),
                    d3.json("data/WI_SurroundStates.topojson"),
                    d3.json("data/Wisconsin_Counties.topojson")];
                    Promise.all(promises).then(callback);                 

        //data parameter - retrieves data as an array
        function callback(data){ 
                    
            csvData = data[0], states = data[1], wiCounties = data[2];   
            
            setGraticule(map, path);
            
            //2 arguments for features in topojson, 2nd part of 2nd argument refers to the objects in the topojson - syntax must be exact same and will fail if file name is changed
            var statesMid = topojson.feature(states, states.objects.WI_SurroundStates),
                countyNRHP = topojson.feature(wiCounties, wiCounties.objects.Wisconsin_Counties).features;//have to add .features to end to create an array
            
            var stateFeatures = map.append("path")
                .datum(statesMid)//everything will be drawn as a single feature
                .attr("class", "stateFeatures")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            countyNRHP = joinData(countyNRHP, csvData);

            //add enumeration units to the map
            setEnumerationUnits(countyNRHP, map, path);
        };
    };//end of set map

            //var attrArray = ["y1970s_change", "y1980s_change", "y1990s_change", "y2000s_change", "y2010s_change"]
        function joinData(countyNRHP, csvData){    
            //loop through csv to assign each set of csv attribute values to geojson region
            for (var i=0; i<csvData.length; i++){
                var csvCounty = csvData[i]; //the current region
                var csvKey = csvCounty.Name; //the CSV primary key

                    //loop through geojson regions to find correct region
                for (var a=0; a<countyNRHP.length; a++){

                    var geojsonProps = countyNRHP[a].properties; //the current region geojson properties
                    var geojsonKey = geojsonProps.NAME; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey){

                        //assign all attributes and values
                        attrArray.forEach(function(attr){
                            var val = parseFloat(csvCounty[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
                
            };
            console.log(countyNRHP)
            return countyNRHP;
        };
        
        function setGraticule(map, path){
            //create graticule generator with lines at 5 deg lat/long increments
            var graticule = d3.geoGraticule()
                .step([5,5]);

            //create graticule background and class for styling
            var gratBackground = map.append("path")
                .datum(graticule.outline())
                .attr("class", "gratBackground")
                .attr("d", path);           
            
            //method to create graticule lines and class - same syntax as other variables
            var gratLines = map.selectAll(".gratLines")
                .data(graticule.lines())
                .enter()
                .append("path")
                .attr("class", "gratLines")
                .attr("d", path);
            };

        function setEnumerationUnits(countyNRHP, map, path){
            //adding WI counties to the map
            var countyFeatures = map.selectAll(".counties")
                .data(countyNRHP)
                .enter()
                .append("path")
                .attr("class", function(d){
                    return "counties " + d.properties.NAMELSAD;
                })
                .attr("d", path);//finds coordinates of the path - "d" does not stand for datum
            };            
            
        
    
})();

    





