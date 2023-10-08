//LOAD/IMPORT PUPPETEER - HEADLESS CHROME // 
const puppeteer = require('puppeteer');

//IFTTT  TRIGGER//
var http = require('http');
var url = require('url');

let key = 'dnwdDA51IgsojnlNOOxy64';
let event = 'radioSongRepeat';

//value1 = Song + Artist
//value2 = orignal song time
//value3 = original song + artist and second song time
function triggerIftttMakerWebhook(value1, value2, value3) { 
  let iftttNotificationUrl = `https://maker.ifttt.com/trigger/${event}/with/key/${key}`;
  let postData = JSON.stringify({ value1, value2, value3 });

  var parsedUrl = url.parse(iftttNotificationUrl);
  var post_options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
  };

  if (startDate.getHours() > 8 && startDate.getHours() < 5){ // Only post if between 9-5
    // Set up the request
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    });

    // Trigger a POST to the url with the body.
    post_req.write(postData);
    post_req.end();
  }
}

//CREATE JSON FILE//
const fs = require('fs')
var startDate = new Date()

fs.writeFile(
    './json/' + startDate.getMonth() + "_" + startDate.getDate() + '.json',
    JSON.stringify(["PROGRAM INIT " + startDate.getHours() + ':' + startDate.getMinutes()], null, '\t'),
    (err) => err ? console.error('Data not written! ', err) : console.log('data written')
)

// SONG OBJECT //
function songPlayed (title, artist, timeHour, timeMinutes){
    this.title = title
    this.artist = artist
    this.timeHour = timeHour
    this.timeMinutes = timeMinutes

    this.compare = function(other){
        if (this.title == other.title){
            if (this.artist == other.artist){
                return true 
            }
        }
    }

    this.getTime = function(){
        var period = 'AM'
        var hourValue = this.timeHour
        if(hourValue > 12){
            hourValue -= 12
            period = 'PM'
        }
        return (hourValue + ':' + this.timeMinutes + ' ' + period)
    }

    this.printSong = function(){
        return (this.title + ' By ' + this.artist)
    }
}

//JSON APPEND//
function appendSong(currentSong){   
    startDate = new Date(); //Error occurs because I try to readfile from new date that hasnt been written yet :( so when it ticks over 12 the program shuts down)
    fs.readFile(
        './json/' + startDate.getMonth() + "_" + startDate.getDate() + '.json',
        function (err, data) {
        var json = JSON.parse(data);
        json.push(currentSong);    
        fs.writeFile('./json/' + startDate.getMonth() + "_" + startDate.getDate() + '.json', JSON.stringify(json, null, '\t'), function(err){
        if (err) throw err;
        console.log('The "data to append" was appended to file!');
        });
    })
}

//SONG LIST AND COMPARING //
var songList = []; 

function songCompare(currentSong){
    if (songList.length > 0){
        for (var i =0; i < songList.length; i++){ 
            if((currentSong.compare(songList[i])) 
            && (currentSong.artist != "Loading...")){ // Sometimes the song doesn't appear and you get "Loading in the artists spot, this si to prevent this from causing false positives"
                console.log("REPEATED SONG: " + currentSong.printSong() + " at " + currentSong.getTime() + " is a repeat of " + songList[i].printSong() + " at " + songList[i].getTime());
                triggerIftttMakerWebhook(currentSong.printSong(), songList[i].getTime(), ("Check Original Song Name: " + songList[i].printSong() + " Check second time played time: " + currentSong.getTime()));
                return true;
            }
        }
    }
    return false;
}

function addSongToList(currentSong){
    if(songList.length > 0){
        if (currentSong.compare(songList[songList.length-1])){ // Make sure it wasn't last song added
            //songCompare(currentSong) //Testing!!!
            //console.log('Didnt add song because its last song ' + currentSong.printSong())
            return;
        }
        console.log("Added new song " + currentSong.printSong() + " at " + currentSong.getTime() + ". Was song a repeat? " + songCompare(currentSong) + " ,Total songs before this " + songList.length); // Check if already in the list
        //console.log('Added new song ' + currentSong.printSong())
        songList.push(currentSong);
        appendSong(currentSong);
        //appendSong(currentSong);
        return;
    }
    songList.push(currentSong);
    appendSong(currentSong);
    console.log('First song added and it is ' + currentSong.printSong() + " at " + currentSong.getTime());
    return;
}

//REPEATING WEB SCRAPING//
setInterval(async () => {
        //Wrapper to catch errors
    try{
        //New browser instance
        const browser = await puppeteer.launch()

        // Create a page/tab
        const page = await browser.newPage()

        //navigate to site
        // await page.goto('http://www.mix106.com.au/')
        await page.goto('https://www.iheart.com/live/mix-1063-6244/')

        //HTML Scrape
        const songData = await page.evaluate(() => {
            // const SONG_SELECTOR = 'div.song-title'
            // const ARTIST_SELECTOR = 'div.song-artist'
            const SONG_SELECTOR = '[data-test="mini-player-track-text"]'
            const ARTIST_SELECTOR = '[data-test="mini-player-description-text"]' // ARTIST and SONG JQEURY SELECTOR FOR
            var today = new Date()
            var trackData = document.querySelector(SONG_SELECTOR)
            var descriptionData = document.querySelector(ARTIST_SELECTOR)
            if (trackData != null){
                var songName = trackData.innerText
                var artistName = descriptionData.innerText //Canberra's Greatest Hits
                return [songName, artistName, today.getHours(), today.getMinutes()]
            }
            else {
                return null;
            }
        })

        if (songData != null){
            var song = new songPlayed(songData[0], songData[1], songData[2], songData[3])
            addSongToList(song);

                    //take a screenshot
            await page.screenshot({
            path: './screenshots/' + songData[2] + "_" + songData[3] + '.png'
            })
        }

        // //Save the data as JSON
        // const fs = require('fs')
        // fs.writeFile(
        //     './json/teams.json',
        //     JSON.stringify()
        // )

        await browser.close()
    } catch (error){
        console.log(error)
    }
}, 60*1000);