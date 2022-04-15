

//SVG dimension variables
var w = 900, h = 500;

//execute script when window is loaded
window.onload = function(){

    var container = d3.select("body") //get the <body> HTML element from the DOM
        //method chaining
        .append("svg") //put a new svg in the body
        .attr("width", w) //assign the width set to w
        .attr("height", h) //assign the height set to h
        //can also go into css and set background styles using the class = .container
        .attr("class", "container") //always assign a class (as the block name) for styling and future selection
        //need to add a background color to see what is happening in the svg block
        .style("background-color", "rgba(0,109,44,0.5)"); //only put a semicolon at the end of the block!

        //console.log(container);
    
    //Example 1.5 - incorrectly formatted block - appending this closes out svg
    //can cause problems if too many methods are appended to a variable, best practice to put new methods in new blocks 
    /*.append("rect") //add a <rect> element
    .attr("width", 800) //rectangle width
    .attr("height", 400) //rectangle height*/

    //Example 1.6 - innerRect block
    /*var innerRect = container.append("rect") //put a new rect in the svg
        .datum(400)
        .attr("width", 800) //rectangle width
        .attr("height", 400) //rectangle height
    
    console.log(innerRect)*/

    //Example 1.8 appending innerRect block to the container variable
    var innerRect = container.append("rect")
        .datum(400) //a single value is a DATUM - method applied to the variable
        .attr("width", function(d){ //rectangle width using the datum with a function
            return d * 2; // using datum, always called by 'd' 400 * 2 = 800
        })
        .attr("height", function(d){ //rectangle height using the datum with a function
            return d; //using datum 400
        })
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis
        .style("fill", "#f7fcf0"); //fill color - can't use bakground-color format here because its used in overall svg element

    
    


    //array of objects with city and pop values from Week 2
    var cityPop = [
        {
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

    //create a linear scale to convert data without having to find precise coefficient manually
    //Linear is one of several scale options offered by D3
    //Scale must be defined above functions that use it or it will not be applied
    var x = d3.scaleLinear()//crates a generator - custom functiondeciding the range of each output value
        //left(west) extent, right(east) extent
        .range([85, 755])//output minimum and maximum - pixel values on the page/map
        .domain([0, 3]);//input minimum and maximum - info we are putting into the function - INDEX OF THE ARRAY OBJECTS 0,1,2,3

//Defining y scale more complicated than x; have to consider the minimum and maximum values of the data being used

    //find the minimum value of the array without having to physically search the dataset
    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    //find the maximum value of the array without going through the dataset
    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    //Setting the y scale using the min and max values from the above variables
    /*var y = d3.scaleLinear()
        //lower (south) extent of rectangle(left), upper (north) extent(right)
        .range([440, 95])//pixel values being interpolated; min/max values flipped - ensures higher values assicated with 'up'
        .domain([
            minPop,
            maxPop
        ]);*/
        //example 3.11 - adjusting the y-scale to extend scale bar to upper/lower limits of rectangle
    var y = d3.scaleLinear()
        //lower (south) extent of rectangle(left), upper (north) extent(right)
        .range([450, 50])
        .domain([0, 700000]);

    //Generating color scales
    var color = d3.scaleLinear()
        //two color values entered - D3 knows how to interpolate color values - based on rgb codes
        //arranged in smaller to larger format - D3 will interpolate the colr range based on the input here
        .range([
            "#e7d4e8",
            "#762a83"
        ])
        .domain([
            minPop,
            maxPop
        ]);

    //appends a circle for every item in dataValues array
    var circles = container.selectAll(".circles")//placeholder or empty selection because circles have not been created yet - USE CLASS NAME IN EMPTY SELECTION
            .data(cityPop)//calling the multiple data values in the array variable; set to dataValues or cityPop depending on data source
            .enter()//assigns data to empty selection and makes it available for use as new elements are being created
            .append("circle")//creates a new circle for every item in the array; iterates on its own without a function
            .attr("class","circles")//set class for the circle, MUST MATCH WHAT IS IN SELECTALL FUNCTION
            .attr("id", function(d){
                return d.city;
            })
            //sets radius
            .attr("r",function(d){
                //calculate the circle radius based on populations in array
                var area = d.population * 0.01;//have to set very small because dealing with pixel size and the circle size could potentially engulf the page
                return Math.sqrt(area/Math.PI);//converts the area to the radius
            })
            //sets circle x coordinate, i refers to the index of the data here
            //always have to call the data first before the index
            .attr("cx", function(d, i){
                //calls on Linear scale from above and the index
                return x(i);//spaces the circle width (horizontal axis) using x values
            })
            //sets circle y coordinate
            .attr("cy", function(d){
                //subtracting from the max value at the bottom of the rectangle, multiplied by smaller number to distance is not off page/map
                return y(d.population);//spaces the circle height (verticle axis) using min and max value range from y variable
            })
            //applies color values stored within color variable above
            .style("fill", function(d){
                return color(d.population);
            })
            .style("stroke", "#000");//creates a black color stroke around circles
        
    //Example 3.7
    var yAxis = d3.axisLeft(y);//creating a y axis generator

    var axis = container.append("g")//creating an axis g element and adding it to the axis
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")//Example 3.9 transforming attr to the g-element; translate moves axis to the right of the 0,0 corrdinate(in view) by entering 50
        //basically translates the x,y coordinates of the axis
        .call(yAxis);
    
    //adding a title [class] to the chart
    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")//centers the text - without this centering would have to be done by offsetting x coordinate value
        .attr("x", 450)//assigns horizontal position
        .attr("y", 30)//assign verticle position
        .text("City Populations")//text content
        //.style("fill", "#810f7c");

    //example 3.14 & 3.15 - creating circle labels
    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        /*.attr("x", function(d,i){
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })*/
        .attr("y", function(d){
            //vertical position centered on each circle
            return y(d.population) - 2;//adjusted to center the label block on the circles
        });
        /*.text(function(d){
            return d.city + ", Pop. " + d.population;
        });*/
    
    //creating the first line in the label
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")//create name line class
        //calculates the horizontal position to the right of the circles
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        //returns the city name
        .text(function(d){
            return d.city;
        });

    //example 3.17 - creating a format generator for text
    var format = d3.format(",");//generates commas to where applied

    //creating the second line in the label
    var popLine = labels.append("tspan")
        .attr("class", "popLine")//create population line class
        //calculates the horizontal position to the right of the circles
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15")//example 3.16 - gives second line a verticle offset to avoid overlap
        //returns the population formatted with commas
        .text(function(d){
            return "Pop. " + format(d.population);
        });

    
};

    





