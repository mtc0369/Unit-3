
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
    //can store 3 different datasets here
    var promises = []
        promises.push(d3.csv("data/NRHP_List_Wisconsin_Final.csv")),
        promises.push(d3.json("data/WI_SurroundStates.topojson")),                    
        promises.push(d3.json("data/Wisconsin_Counties.topojson"));//projection should be in WGS 84                        
        Promise.all(promises).then(callback);//ajax - fetches multiple datasets at same time

    //data parameter - retrieves data as an array
    function callback(data){ 
                
        csvData = data[0],//set at 0 for first feature in array
        states = data[1],    
        wiCounties = data[2];//set at 1 for second feature in array    
        //console.log(csvData);
        //console.log(wiCounties);
        //2 arguments for features in topojson, 2nd part of 2nd argument refers to the objects in the topojson - syntax must be exact same and will fail if file name is changed
        var statesMid = topojson.feature(states, states.objects.WI_SurroundStates),
            countyNRHP = topojson.feature(wiCounties, wiCounties.objects.Wisconsin_Counties).features;//have to add .features to end to create an array
        //console.log(countyNRHP);
              
        //create graticule generator with lines at 5 deg lat/long increments
        var graticule = d3.geoGraticule()
            .step([5,5]);

        //create graticule background and class for styling
        var gratBackground = map.append("path")
            .datum(graticule.outline())
            .attr("class", "gratBackground")
            .attr("d", path);
        
        //don't need this part because this is for basemap dataset
        var stateFeatures = map.append("path")
            .datum(statesMid)//everything will be drawn as a single feature
            .attr("class", "stateFeatures")
            .attr("d", path);

        //method to create graticule lines and class - same syntax as other variables
        var gratLines = map.selectAll(".gratLines")
            .data(graticule.lines())
            .enter()
            .append("path")
            .attr("class", "gratLines")
            .attr("d", path);

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
};


    





