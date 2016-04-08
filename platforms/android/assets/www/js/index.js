var colors; 

var plantCoords = [
  {"lat": 14.446363, "longi" : -87.265564, "name":"Agalteca", "code":"aga"},
  {"lat": 13.852931, "longi" : -86.685029, "name":"Alauca","code":"ala"},
  {"lat": 14.929551, "longi" : -88.490029, "name":"Atima", "code":"ati"},
  {"lat": 14.248744, "longi" : -87.412891, "name":"Cuatro Comunidades", "code":"ccom"},
  {"lat": 14.492795, "longi" : -87.977579, "name":"Jesus de Otoro", "code":"doto"},
  {"lat": 14.156052, "longi" : -88.036309, "name":"Marcala", "code":"mar1"},
  {"lat": 14.123442, "longi" : -86.869707, "name":"Moroceli", "code":"moro"},
  {"lat": 13.980974, "longi" : -86.623315, "name":"San Matias", "code":"smat"},
  {"lat": 15.000367, "longi" : -88.731957, "name":"San Nicolas", "code":"snic"},
  {"lat": 14.189934, "longi" : -87.331426, "name":"Tamara", "code":"tam"}
];

var units = {
 "raw_turb":"NTU",
 "settled_turb":"NTU",
 "coagulant":"mg/L",
 "flow_rate":"L/s",
};

var prettyNames = {
 "raw_turb":"Raw Turbidity",
 "settled_turb":"Settled Turbidity",
 "coagulant":"Coagulant",
 "flow_rate":"Flow Rate",
};

//Hardcoded to just be Moroceli for now...
var codeList = ["moro"]; //list of currently chosen plants (by code)
var data;

d3.json("past_data.json", function(error, rows){
  data =rows;

  /* Sort input data by date .............................................*/
  function sortByDateAscending(a, b) {
      // Dates will be cast to numbers automagically:
      return new Date(a.date_submitted) - new Date(b.date_submitted);
  }
  data = data.sort(sortByDateAscending);

  /* Nest and display data ...............................................*/
  
  //Sort array by plant
  var plantData = d3.nest()
    .key(function(d) { return d.code; })
    .entries(data);

  //Associative array
  var plantDataDict = {};
  plantData.forEach(function(plant){
    plantDataDict[plant.key] = plant.values;
  });

  //D3 Color Scale using 20 distinct colors
  //Get the 11 dimensions
  var dataFields = Object.keys(plantDataDict[Object.keys(plantDataDict)[0]][0]);
  dataFields.splice(0,1); //Assumes pid is first and gets rid of it
  colors = d3.scale.category10().domain( dataFields );

  /* Create plot .........................................................*/
  var height = 350;
  var width = 290;
  var plot_padding_right = 42;
  var plot_padding_left = 42;
  var plot_padding_bottom = 62;
  var plot_padding_top = 20;

  var svg = d3.select("#plot").append("svg")
    .attr("height", height)
    .attr("width", width);

  /* Create and draw axes ................................................*/
  var xScale; var yScale; var xAxis; var yAxis0;

  makeXScale = function(data){
    //Can take first and last because they are already sorted
    var xMin = new Date(data[0].date_submitted);
    var xMax = new Date(data[data.length -1].date_submitted);
    xScale = d3.time.scale()
      .domain([xMin, xMax])
      .range([plot_padding_left, width-plot_padding_right]);
    return xScale;
  }

  drawXAxis = function(xScale){
    var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient("bottom");
      
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", "translate("+0+", " + (height-plot_padding_bottom) + ")")
      .call(xAxis)
      .selectAll("text")  
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", function(d) {
            return "rotate(-65)" 
            });
    svg.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "middle")
      .attr("x", (width- plot_padding_left - plot_padding_right)/2.0 + plot_padding_left)
      .attr("y", height - 6)
      .text("Time");
  }

  makeYScale = function(data, attr_name){
    var yScale = d3.scale.linear()
      .domain([0, d3.max(data, function (d) {return d[attr_name]; })])
      .range([height-plot_padding_bottom, plot_padding_top]);
    return yScale;
  }

  drawYAxis = function(yScale, attr_name){
    var yAxis = d3.svg.axis().scale(yScale).orient("left");
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(" + plot_padding_left + ", "+ 0+")")
      .call(yAxis);

    svg.append("text")
      .attr("class", "y label 1")
      .attr("text-anchor", "middle")
      .attr("dy", ".75em")
      .attr("transform", "rotate(-90) translate("+ (-(height - plot_padding_top - plot_padding_bottom)/2.0 - plot_padding_top) +" 3)")
      
      .text( prettyNames[attr_name] + " (" + units[attr_name] + ")");
  }

  drawSecondYAxis = function(yScale, attr_name){
    var yAxis = d3.svg.axis().scale(yScale).orient("right");
    svg.append("g")
      .attr("class", "axis")
      .attr("id", "secondaxis")
      .attr("transform", "translate(" + (width - plot_padding_right) + ", "+ 0+")")
      .call(yAxis);

    svg.append("text")
      .attr("class", "y label 2")
      .attr("text-anchor", "middle")
      .attr("dy", ".75em")
      .attr("transform", "rotate(-270) translate( "+((height - plot_padding_bottom - plot_padding_top)/2.0 + plot_padding_top) +" "+(-width+3)+")")
      .text( prettyNames[attr_name] + " (" + units[attr_name] + ")");
  }

  /* Make the line graph .................................................*/
  function drawLines(data, xScale, yScale, attr_name, codeList){
    var lineGen = d3.svg.line()
      .x(function(d) {
          return xScale(new Date(d.date_submitted));
      })
      .y(function(d) {
          return yScale(d[attr_name]);
      })
      .defined(function(d) { 
        return !isNaN(d[attr_name]); 
      });  

    //Draw the line graph for each plant with code in codelist
    svg.selectAll("#linegraphline"+attr_name).remove();

    //Check if this code was selected in order to draw it
    plantCode = data[0].code;

    if ($.inArray(plantCode, codeList)>-1){
      svg.append('g').append("path")
        .attr('d', lineGen(data))
        .attr('stroke', function(){
          return colors(attr_name); 
        }) 
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .attr("id", "linegraphline"+attr_name);
    }
}       

/* code = 
 * selectedList = len 1 or 2 of checkboxes that have been checked
 */
function drawPlot(code, selectedList){
  svg.selectAll(".axis").remove();
  svg.selectAll("path").remove();
  svg.selectAll("text").remove();

  xScale = makeXScale(plantDataDict[code]);
  drawXAxis(xScale);

  if (selectedList.length>=1){
    attr1 = selectedList[0];

    if (selectedList.length==2 && selectedList[0].substr(selectedList[0].length - 4) == "turb"
        && (selectedList[1].substr(selectedList[1].length - 4) == "turb")){
      yScale = makeYScale(plantDataDict[code], 'raw_turb');
    }else{
      yScale = makeYScale(plantDataDict[code], attr1);
    }
    drawYAxis(yScale, attr1);
    drawLines(plantDataDict[code], xScale, yScale, attr1, codeList);
    
    //Double axes part of plot
    if (selectedList.length==2){
      attr2 = selectedList[1];
      if (selectedList[0].substr(selectedList[0].length - 4) == "turb"
        && (selectedList[1].substr(selectedList[1].length - 4) == "turb")){
        yScale2 = makeYScale(plantDataDict[code], 'raw_turb');
      }else{
        yScale2 = makeYScale(plantDataDict[code], attr2);
      }
      drawSecondYAxis(yScale2, attr2);
      drawLines(plantDataDict[code], xScale, yScale2, attr2, codeList);
    }
  }
}

drawPlot("moro", ["raw_turb"]);

$(document).ready(function() {
  var matches = ["raw_turb"];
  $(".filled-in").on("click", function() {
    if ($.inArray(this.value, matches)==-1){
      matches.push(this.value);
    }else{
      ind = matches.indexOf(this.value);
      matches.splice(ind,1);
    }
    
    if (matches.length == 3){
      removed = matches.shift();
      $(".filled-in").prop("checked", false);

    }  
    matches.forEach(function(m){
      $('#'+m).prop("checked", true);
      
    });
    drawPlot("moro", matches);
  });
});

//Wouldn't it be cool if they could sweep a vertical bar over the data and 
//see what the exact values were?
 });