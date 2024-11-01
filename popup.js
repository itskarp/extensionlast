document.getElementById('run-scrape').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "createSidebarAndScrape" }, (response) => {
            if (response && response.courseData) {
                displayCourses(response.courseData);
                document.getElementById('download-pdf').style.display = 'block'; // Show the PDF button
            } else {
                console.error("No response received from content script.");
            }
        });
    });
});

// Add the download PDF functionality
document.getElementById('download-pdf').addEventListener('click', () => {
    const element = document.getElementById('output');
    html2pdf()
        .set({
            margin: 1,
            filename: 'course_plan.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        })
        .from(element)
        .save();
});

function displayCourses(courseData) {
    const courseList = document.getElementById('course-list');
    courseList.innerHTML = '';

    // Display each course section (Still Needed, In-Progress, Completed)
    ['stillNeeded', 'inProgress', 'completed'].forEach(section => {
        const sectionTitle = document.createElement('h3');
        sectionTitle.textContent = section.replace(/([A-Z])/g, ' $1'); // Formats titles
        courseList.appendChild(sectionTitle);

        const ul = document.createElement('ul');
        courseData[section].forEach(course => {
            const li = document.createElement('li');
            li.textContent = `Course: ${course.course}, Title: ${course.title}, ${
                course.grade ? `Grade: ${course.grade}, ` : ''
            }Credits: ${course.credits}`;
            ul.appendChild(li);
        });
        courseList.appendChild(ul);
    });
}
