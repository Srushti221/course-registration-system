async function loadCourses(){

const res = await fetch("/api/courses");
const courses = await res.json();

let html = "";

courses.forEach(course => {

html += `
<tr>

<td>${course.code}</td>
<td>${course.title}</td>
<td>${course.instructor}</td>
<td>${course.schedule}</td>
<td>${course.credits}</td>

<td>
<button class="btn btn-success btn-sm" onclick="registerCourse('${course._id}')">
Register
</button>
</td>

</tr>
`;

});

document.getElementById("courses").innerHTML = html;

}

async function registerCourse(id){

const res = await fetch("/api/courses/register",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({courseId:id})
});

const data = await res.json();

alert(data.message || data.error);

loadCourses();

}

loadCourses();