const remote = require('electron').remote;
const session = remote.session;
const needle = require('needle');
const dialogs = require('dialogs')(opts={});
const fs = require('fs');
var mkdirp = require('mkdirp')

$('form').submit((e)=>{
e.preventDefault();
var email = $(e.target).find('input[name="email"]').val();
var password = $(e.target).find('input[name=password]').val();

if(!email || !password){
   dialogs.alert('Type Username/Password');
   return;
}
$.ajax({
   type: 'GET',
   url:'https://www.udemy.com/join/login-popup',
   beforeSend: function(){
     $(".ui.login .dimmer").addClass('active');
   },
   	success: function(data, status, xhr){
   	var token = $('input[name=csrfmiddlewaretoken]',data).val();
   	var cookie = '';
   	session.defaultSession.cookies.get({url: 'https://www.udemy.com'}, (error, cookies) => {		
	for (var key in cookies){
		cookie +=  cookies[key].name+'='+cookies[key].value+';';
	}

needle
   .post('https://www.udemy.com/join/login-popup/?ref=&display_type=popup&locale=en_US&response_type=json&next=https%3A%2F%2Fwww.udemy.com%2F&xref=', {email:email,password:password,csrfmiddlewaretoken:token,locale:'en_US'}, {headers: {'Cookie': cookie,'Referer': 'https://www.udemy.com/','Host': 'www.udemy.com','X-Requested-With': 'XMLHttpRequest','User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36'}})
   .on('readable', function() {
      $(".ui.login .dimmer").removeClass('active');
      if(this.request.res.cookies.access_token){
         $('.ui.login').slideUp('fast');
         $('.ui.dashboard').fadeIn('fast').css('display','flex');
      var access_token = this.request.res.cookies.access_token;
      var header = {"Authorization": `Bearer ${access_token}`};
      $.ajax({
               type: 'GET',
               url: "https://www.udemy.com/api-2.0/users/me/subscribed-courses",
               beforeSend: function(){
                   $(".ui.dashboard .courses.dimmer").addClass('active');
               },
               headers: header,
               success: function(response) { 
                  $(".ui.dashboard .courses.dimmer").removeClass('active');
                  if(response.results.length){
                     $.each(response.results,function(index,course){
                        $('.ui.dashboard .ui.courses.items').append(`
                                <div class="course item" course-id="${course.id}">
                                  <div class="ui tiny image">
                                    <img src="${course.image_240x135}">
                                  </div>
                                  <div class="content">
                                    <span class="coursename">${course.title}</span>
                                    <div class="extra">
                                       <button class="ui red download icon button"><i class="download icon"></i></button>
                                       <div class="ui small red progress">
                                            <div class="bar">
                                              <div class="progress"></div>
                                            </div>
                                            <div class="label">Building Course Data</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                        `);
                     })
                  }else{
                     $('.ui.dashboard .courses').append('<div class="ui yellow message">You don\'t have any subscribed courses</div>')
                  }
               }
            });
      }else{
         dialogs.alert('Incorrect Username/Password');
      }
$('body').on('click','.download.button', function(){
var $course = $(this).parents('.course');
var courseid = $course.attr('course-id');
      $.ajax({
               type: 'GET',
               url: `https://www.udemy.com/api-2.0/courses/${courseid}/cached-subscriber-curriculum-items?page_size=100000`,
               beforeSend: function(){
                   $(".ui.dashboard .course.dimmer").addClass('active');
               },
               headers: header,
               success: function(response) { 
                 $(".ui.dashboard .course.dimmer").removeClass('active');
                 $course.find('.download.button').hide();
                 $course.find('.ui.progress').show();
                 var coursedata = [];
                 coursedata['chapters'] = [];
                 coursedata['name'] = $course.find('.coursename').text();
                 var chapterindex = -1;
                 var lectureindex = -1;
                 var remaining = response.count;
                 coursedata['totallectures'] = 0;
                  $.each(response.results, function(i,v){
                    if(v._class=="chapter"){ 
                         chapterindex++;
                         lectureindex = 0;
                         coursedata['chapters'][chapterindex] = [];
                         coursedata['chapters'][chapterindex]['name'] = v.title;
                         coursedata['chapters'][chapterindex]['lectures'] = [];
                         remaining--;   
                    }else if(v._class=="lecture"&&v.asset.asset_type=="Video"){
                      function  getLecture(lecturename,chapterindex,lectureindex){
                          $.ajax({
                             type: 'GET',
                             url: `https://www.udemy.com/api-2.0/users/me/subscribed-courses/${courseid}/lectures/${v.id}?fields[lecture]=view_html,asset`,
                             headers: header,
                             success: function(response) { 
                                var lecture = JSON.parse($(response.view_html).find('react-video-player').attr('videojs-setup-data'));
                                coursedata['chapters'][chapterindex]['lectures'][lectureindex] = {src:lecture.sources[0].src,name:lecturename};
                                remaining--;
                                coursedata['totallectures']+=1;
                                if(!remaining){
                                  initDownload($course,coursedata);
                                }
                             }
                            });
                     }
                     getLecture(v.title,chapterindex,lectureindex);
                     lectureindex++;
                    }else{
                      remaining--;
                    }
                  });
               }
    });
});
});

});

}

});

});



function initDownload($course,coursedata){

  var coursename = coursedata['name'];
  var totalchapters = coursedata['chapters'].length;
  var totallectures = coursedata['totallectures'];
  var progressElem = $course.find('.progress');
  progressElem.progress({
    total    : totallectures,
    text     : {
      active: 'Downloaded {value} out of {total} lectures'
    }
  });
progressElem.progress('reset');

downloadChapter(0);

function downloadChapter(chapterindex){
if(chapterindex==totalchapters){
return;
}
var num_lectures = coursedata['chapters'][chapterindex]['lectures'].length;
  mkdirp('downloads/'+coursename+'/'+(chapterindex+1)+'. '+coursedata['chapters'][chapterindex]['name'], function(){
    downloadLecture(chapterindex,0,num_lectures);
  });
}

function downloadLecture(chapterindex,lectureindex,num_lectures){
if(lectureindex==num_lectures){
  downloadChapter(++chapterindex);
  return;
}
    var file = fs.createWriteStream('downloads/'+coursename+'/'+(chapterindex+1)+'. '+coursedata['chapters'][chapterindex]['name']+'/'+(lectureindex+1)+'. '+coursedata['chapters'][chapterindex]['lectures'][lectureindex]['name']+'.mp4');
     needle.get(coursedata['chapters'][chapterindex]['lectures'][lectureindex]['src']).pipe(file).on('finish', function() {
     progressElem.progress('increment');
     downloadLecture(chapterindex,++lectureindex,num_lectures);
    });
}

}
