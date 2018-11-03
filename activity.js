/*
Copyright (C) 2018 Alkis Georgopoulos <alkisg@gmail.com>.
SPDX-License-Identifier: CC-BY-SA-4.0

 Scaling requirements:
 * We want to be able to support full screen.
 * We don't want to use a specific size like 800x600, because then even the
   fonts are scaled!
 * We want to rely on a 16:9 aspect ratio.
 So, result:
 * We resize the canvas on window.resize to fit the window while keeping 16:9.
 * We resize/reposition everything manually.
*/
var stage;
var bg;
// Region = {
//   cont: Container, box: Shape, tiles: [Bitmap], color: String, selectedTile,
//   gx: GridX, gy: GridY, ts: TileSize, ma: Margin, x, y }
var r1 = { tiles: Array(9)};
var r2 = { tiles: Array(10)};
// the menu bar buttons
var r4 = { tiles: Array(5) };
var statusText, lvlText;
const ratio = 16/9;
// To use .svg images, they must not have width or height="100%":
// https://bugzilla.mozilla.org/show_bug.cgi?id=874811
// Additionally, preloadjs currently doesn't work with .svg images.
// Put the tiles first so that we can get them by index more easily
var resourceNames = ['g1.svg', 'g2.svg', 'g3.svg', 'g4.svg', 'g5.svg', 'g6.svg', 'g7.svg', 'g8.svg', 'g9.svg', 'g_blank.svg', 'w0.svg', 'w1.svg', 'w2.svg', 'w3.svg', 'w4.svg', 'w5.svg', 'w6.svg', 'w7.svg', 'w8.svg', 'w9.svg', 'bar_home.svg', 'bar_help.svg', 'bar_about.svg', 'bar_previous.svg', 'bar_next.svg', 'background.svg'];
var resources = [];
var resourcesLoaded = 0;
// overi is a frames counter, for game over animations
var game = { level: 0, hint: 2, over: false, overf: 0 };

function init() {
  var i;

  console.clear();
  stage = new createjs.Stage("mainCanvas");
  stage.enableMouseOver();
  stage.snapToPixelEnabled = true;
  createjs.Bitmap.prototype.snapToPixel = true;
  statusText = new createjs.Text("Φόρτωση...", "20px Arial", "white");
  statusText.textAlign = "center";
  statusText.textBaseline = "middle";
  stage.addChild(statusText);
  resize();

  // Resource preloading
  for (i = 0; i < resourceNames.length; i++) {
    resources[i] = new Image();
    resources[i].src = "resource/" + resourceNames[i];
    resources[i].rname = resourceNames[i];
    resources[i].onload = queueFileLoad;
  }
  // The last queueFileLoad calls queueComplete. Execution continues there.
}

function queueFileLoad(event) {
  resourcesLoaded++;
  statusText.text = "Φόρτωση " + parseInt(100*resourcesLoaded/resourceNames.length) + " %";
  stage.update();
  if (resourcesLoaded == resourceNames.length)
    queueComplete(event);
}

// Return an integer from 0 to num-1.
function random(num) {
  return Math.floor(Math.random() * num);
}

function imgByName(name) {
  var i = resourceNames.indexOf(name);
  if (i < 0)
    console.log("imgByName failed for name=" + name);

  return resources[i];
}

function queueComplete(event) {
  var i;

  console.log("Finished loading resources");
  // We only keep statusText for debugging; not visible in production builds
  statusText.visible = false;
  bg = new createjs.Bitmap(imgByName("background.svg"));
  stage.addChild(bg);

  r1.cont = new createjs.Container();
  stage.addChild(r1.cont);
  // We always initialize the max number of tiles, and reuse them
  for (i = 0; i < r1.tiles.length; i++) {
    r1.tiles[i] = new createjs.Bitmap(imgByName("g_blank.svg"));
    r1.tiles[i].i = i;
    r1.cont.addChild(r1.tiles[i]);
  }

  r2.cont = new createjs.Container();
  stage.addChild(r2.cont);
  for (i = 0; i < r2.tiles.length; i++) {
    r2.tiles[i] = new createjs.Bitmap(imgByName("w" + i + ".svg"));
    if (i != 0) {
      r2.tiles[i].addEventListener("click", onR2click);
      r2.tiles[i].addEventListener("mouseover", onRmouseover);
      r2.tiles[i].addEventListener("mouseout", onRmouseout);
    }
    r2.tiles[i].i = i;
    r2.cont.addChild(r2.tiles[i]);
  }

  var onMenuClick = [onMenuHome, onMenuHelp, onMenuAbout, onMenuPrevious, onMenuNext];
  r4.cont = new createjs.Container();
  stage.addChild(r4.cont);
  for (i = 0; i < r4.tiles.length; i++) {
    r4.tiles[i] = new createjs.Bitmap(resources[resourceNames.indexOf("bar_home.svg") + i]);
    r4.tiles[i].addEventListener("click", onMenuClick[i]);
    r4.tiles[i].addEventListener("mouseover", onRmouseover);
    r4.tiles[i].addEventListener("mouseout", onRmouseout);
    r4.tiles[i].i = i;
    r4.cont.addChild(r4.tiles[i]);
  }

  lvlText = new createjs.Text("1", "20px Arial", "white");
  lvlText.textAlign = "center";
  lvlText.textBaseline = "middle";
  stage.addChild(lvlText);

  // Bring statusText in front of everything
  statusText.textAlign = "right";
  statusText.textBaseline = "alphabetic";
  stage.setChildIndex(statusText, stage.numChildren - 1);

  initLevel(game.level);
  setTimeout(showHint, 500);
  window.addEventListener('resize', resize, false);
  createjs.Ticker.on("tick", tick);
  // createjs.Ticker.timingMode = createjs.Ticker.RAF;
  // createjs.Ticker.framerate = 10;
}

function onR2click(event) {
  if (event.target.i == r1.tilesNum) {
    checkGameOver();
    return;
  }
  // Use a red filter to highlight the error
  var hilight = new createjs.ColorFilter(1.2, 0, 0, 1, 0, 0, 0, 0);
  var bitmap = event.target;
  bitmap.filters = [ hilight ];
  bitmap.updateCache();
  stage.update();
}

function onRmouseover(event) {
  var hilight = new createjs.ColorFilter(1.2, 1.2, 1.2, 1, 0, 0, 0, 0);
  var bitmap;

  // Support both real and fake events
  if ('target' in event)
    bitmap = event.target;
  else
    bitmap = event;
  bitmap.filters = [ hilight ];
  bitmap.updateCache();
  stage.update();
}

function onRmouseout(event) {
  var bitmap;

  // Support both real and fake events
  if ('target' in event)
    bitmap = event.target;
  else
    bitmap = event;
  bitmap.filters = [ ];
  bitmap.updateCache();
  stage.update();
}

function onMenuHome(event) {
  window.history.back();
}

function onMenuHelp(event) {
  alert("Κάντε κλικ στο βαγόνι με τον αριθμό που είναι ίδιος με το πλήθος των δώρων.");
}

function onMenuAbout(event) {
  window.open("credits/index_DS_II.html");
}

function onMenuPrevious(event) {
  initLevel(game.level - 1);
}

function onMenuNext(event) {
  initLevel(game.level + 1);
}

// tilesArray, tileWidth, boxWidth
function alignTiles(tilesA, tileW, boxW) {
  var i;

  // We do want at least one pixel spacing between the tiles
  tilesPerRow = Math.floor(boxW/(tileW+1))
  // If all tiles fit, use that number
  tilesPerRow = Math.min(tilesA.length, tilesPerRow)
  margin = (boxW - tileW*tilesPerRow) / (tilesPerRow-1)
  for (i = 0; i < tilesA.length; i++) {
    if (!tilesA[i].image) {
      console.log(i)
      console.log(tilesA)
    }
    tilesA[i].scaleX = tileW / tilesA[i].image.width;
    tilesA[i].scaleY = tileW / tilesA[i].image.height;
    tilesA[i].regX = tilesA[i].image.width / 2;
    tilesA[i].regY = tilesA[i].image.height / 2;
    tilesA[i].x = (margin+tileW) * (i % tilesPerRow) + tilesA[i].scaleX*tilesA[i].regX;
    tilesA[i].y = (margin+tileW) * Math.floor(i / tilesPerRow) + tilesA[i].scaleY*tilesA[i].regY;
    // These copies are used to preserve the initial coordinates on drag 'n' drop
    tilesA[i].savedX = tilesA[i].x
    tilesA[i].savedY = tilesA[i].y
    // These copies are used to preserve the original scale on mouseover
    tilesA[i].savedscaleX = tilesA[i].scaleX;
    tilesA[i].savedscaleY = tilesA[i].scaleY;
    tilesA[i].cache(0, 0, tilesA[i].image.width, tilesA[i].image.height)
  }
}

function alignRegion(r) {
  r.cont.x = r.x + r.ma;
  r.cont.y = r.y + r.ma;
  alignTiles(r.tiles, r.ts, r.gx*r.ts + (r.gx-1)*r.ma);
}

// tilesArray, tileWidth, boxWidth
function alignTrains(r) {
  var i;

  r.cont.x = r.x + r.ma;
  r.cont.y = r.y + r.ma;
  for (i = r.tiles.length-1; i >= 0; i--) {
    if (i == 0) {
      // We want the same scale, but not the same size, for the first wagon
      r.tiles[i].scaleX = r.tiles[1].scaleX;
      r.tiles[i].scaleY = r.tiles[1].scaleY;
    } else {
      r.tiles[i].scaleX = r.ts / r.tiles[i].image.width;
      r.tiles[i].scaleY = r.tiles[i].scaleX;
    }
    // Use their base for reg, so that the wheels align
    r.tiles[i].regX = r.tiles[i].image.width / 2;
    r.tiles[i].regY = r.tiles[i].image.height;
    r.tiles[i].x = i*(0.95*r.ts) + r.tiles[i].scaleX*r.tiles[i].regX;
    r.tiles[i].y = 0;
    // These copies are used to preserve the original scale on mouseover
    r.tiles[i].savedscaleX = r.tiles[i].scaleX;
    r.tiles[i].savedscaleY = r.tiles[i].scaleY;
    r.tiles[i].cache(0, 0, r.tiles[i].image.width, r.tiles[i].image.height)

    // Bring the wagon to the front, to hide its red connector
    r.cont.setChildIndex(r.tiles[i], r.cont.numChildren - 1)
  }
  // The first wagon is wider, move it to the left
  r.tiles[0].x *= 0.75;
}

function resize() {
  // Resize the canvas element
  var winratio = window.innerWidth/window.innerHeight;
  if (winratio >= ratio) {
    stage.canvas.height = window.innerHeight;
    stage.canvas.width = stage.canvas.height * ratio;
  } else {
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = stage.canvas.width / ratio;
  }

  // If queueComplete() hasn't been called yet, the rest of the items aren't available
  if (!("cont" in r1)) {
    statusText.x = stage.canvas.width / 2;
    statusText.y = stage.canvas.height / 2;
    statusText.font = parseInt(stage.canvas.height/10) + "px Arial";
    return;
  }

  // Region1
  r1.ts = stage.canvas.width / 14;
  r1.ma = 0.10 * r1.ts;
  r1.x = 0.50 * (stage.canvas.width - r1.tilesNum * (r1.ts + r1.ma));
  r1.y = 0.15 * stage.canvas.height;
  alignRegion(r1);

  // Region2
  r2.ts = stage.canvas.width / 12;
  r2.ma = 0;
  r2.x = 0.10 * stage.canvas.width;
  r2.y = 0.62 * stage.canvas.height;
  alignTrains(r2);

  // Region4
  r4.ts = stage.canvas.height / 10;
  r4.ma = r4.ts / 5;
  r4.x = 0;
  r4.y = stage.canvas.height - r4.ts - 2*r4.ma;
  alignRegion(r4);
  // Make space for the level
  r4.tiles[r4.tiles.length-1].x += r4.ts + r4.ma;

  lvlText.text = game.level + 1;
  lvlText.x = parseInt(4.5*(r4.ma+r4.ts) + r4.ma/2);
  lvlText.y = stage.canvas.height - r4.ma/2 - r4.ts/2;
  lvlText.font = parseInt(2*r4.ts/2) + "px Arial";

  // If game.level is single digit, move lvlText and bar_previous a bit left
  if (game.level + 1 < 10) {
    lvlText.x -= r4.ts/4;
    r4.tiles[r4.tiles.length-1].x -= r4.ts/2;
  }

  statusText.text = "Επίπεδο: " + (game.level + 1);
  statusText.x = stage.canvas.width - r4.ma;
  statusText.y = stage.canvas.height - r4.ma;
  statusText.font = parseInt(r4.ts/2) + "px Arial";

  // Fill all the canvas with the background
  bg.scaleX = stage.canvas.width / bg.image.width;
  bg.scaleY = stage.canvas.height / bg.image.height;
  bg.cache(0, 0, bg.image.width, bg.image.height);

  stage.update();
}

// Return a shuffled array [0, ..., num-1].
// If different_index==true, make sure that array[i] != i.
function shuffled_array(num, different_index) {
    var result = [];
    var i, j, temp;

    // Fill the array with [0, ..., num-1]
    for (i = 0; i < num; i++)
        result.push(i);
    // shuffle the array
    for (i = 0; i < num; i++) {
        j = random(num);
        temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    // Make sure that result[i] != i
    if (different_index)
        for (i = 0; i < num; i++)
            if (result[i] == i) {
                j = (i + 1) % num;
                temp = result[i];
                result[i] = result[j];
                result[j] = temp;
            }
    return result;
}

function initLevel(newLevel) {
  // Internal game.level number is zero-based; but we display it as 1-based.
  // We allow/fix newLevel if it's outside its proper range.
  var numLevels = 14;
  var i;

  game.level = (newLevel + numLevels) % numLevels;
  // Gifts per level (min…max):
  // 1…3, 1…3, 1…4, 2…4, 2…5, 2…5, 3…6, 3…6, 3…7, 4…7, 4…8, 4…8, 5…9, 5…9
  min = 1 + Math.floor(game.level/3);
  max = 3 + Math.floor(game.level/2);

  // Region1
  var oldNum = 0;
  if ("tilesNum" in r1)
    oldNum = r1.tilesNum;
  r1.tilesNum = min + random(max - min + 1);
  // Avoid showing the same number of gifts in two subsequent levels
  if (oldNum == r1.tilesNum)
    if (r1.tilesNum < max)
      r1.tilesNum++;
    else
      r1.tilesNum--;
  r1.gx = r1.tilesNum;
  r1.gy = 1;
  shufa = shuffled_array(r1.tilesNum, false)
  for (i = 0; i < r1.tiles.length; i++)
    if (i < r1.tilesNum)
      r1.tiles[i].image = imgByName("g" + (shufa[i]+1) + ".svg")
    else
      r1.tiles[i].image = imgByName("g_blank.svg");

  // Region2
  r2.tilesNum = 10;
  r2.gx = 10;
  r2.gy = 1;
  for (i = 0; i < r2.tiles.length; i++)
    r2.tiles[i].visible = true;

  // Region4
  r4.tilesNum = 5;
  r4.gx = 5;
  r4.gy = 1;

  game.over = false;
  game.overf = 0;
  resize();
}

function showHint() {
  if (game.hint % 2 == 0)
    onRmouseover(r2.tiles[Math.floor(game.hint/2)]);
  else
    onRmouseout(r2.tiles[Math.floor(game.hint/2)]);

  game.hint += 1;
  if (game.hint < 2*r2.tiles.length)
    setTimeout(showHint, 100);
}

function checkGameOver() {
  var i, ps, pt;  // point source, point target

  for (i = 0; i < r1.tilesNum; i++)
    r1.tiles[i].dx = -(r2.tiles[i].x - r1.tiles[i].x) / 40;
  ps = r2.cont.localToGlobal(r2.tiles[1].x, r2.tiles[1].y);
  pt = r1.cont.localToGlobal(r2.tiles[0].x, r2.tiles[0].y);
  // wagons are not really centered due to the connector
  r2.cont.dx = (pt.x - ps.x - 0.09*r1.ts) / 20;

  for (i = r1.tilesNum+1; i < r2.tiles.length; i++)
    r2.tiles[i].visible = false;
  game.over = true;
  setTimeout(onMenuNext, 4000);
  stage.update();
}

function tick() {
  var i;

  if (game.over)
    game.overf += 1;
  // Calculations are based on 20 fps
  if (game.overf > 20) {
    r2.cont.x -= 0.01 * stage.canvas.width;
    r1.cont.x -= 0.01 * stage.canvas.width;
  } else if (game.overf > 0) {
    r1.cont.y += 0.014 * stage.canvas.height;
    r2.cont.x += r2.cont.dx;
  }
  statusText.text = "Επίπεδο: " + (game.level + 1 ) + ', fps: ' + Math.round(createjs.Ticker.getMeasuredFPS());
  stage.update();
}
