// Function to create a sidebar
function createSidebar() {
    var sidebar = document.createElement('div');
    
    // Set styles for the sidebar
    sidebar.style.position = 'fixed';
    sidebar.style.right = '0px';
    sidebar.style.top = '0px';
    sidebar.style.width = '300px';
    sidebar.style.height = '100%';
    sidebar.style.backgroundColor = '#f4f4f9';
    sidebar.style.zIndex = '1000';
    sidebar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    sidebar.style.padding = '20px';
    sidebar.style.overflowY = 'auto'; // Allow scrolling if content exceeds sidebar height

    // Sidebar content - this will be dynamically updated with course information
    sidebar.innerHTML = `
        <h1>Course Plan</h1>
        <div id="still-needed-section">
            <h2>Still Needed</h2>
            <ul id="still-needed-list">Loading...</ul>
        </div>
        <div id="in-progress-section">
            <h2>In-Progress Courses</h2>
            <ul id="in-progress-list">Loading...</ul>
        </div>
        <div id="completed-section">
            <h2>Completed Courses</h2>
            <ul id="completed-list">Loading...</ul>
        </div>
        <button id="generate-recommendation" style="margin-top: 20px;">Generate Recommendation</button>
        <button id="create-courseplan" style="margin-top: 10px;">Create Courseplan</button>
        <div id="gpt-response-section" style="margin-top: 20px;">
            <h2>Suggested Course Plan</h2>
            <p id="gpt-response">Click "Create Courseplan" to get your plan.</p>
        </div>
    `;

    // Append the sidebar to the body
    document.body.appendChild(sidebar);

    // Set up the button's event listener for generating recommendation
    document.getElementById("generate-recommendation").addEventListener("click", async () => {
        await generateRecommendation();
    });

    // Set up the button's event listener for creating a course plan
    document.getElementById("create-courseplan").addEventListener("click", async () => {
        await createCourseplan();
    });
}

// Function to update the sidebar with JSON data
function updateSidebar(courseData) {
    const stillNeededList = document.getElementById('still-needed-list');
    const inProgressList = document.getElementById('in-progress-list');
    const completedList = document.getElementById('completed-list');

    // Clear the existing lists
    stillNeededList.innerHTML = '';
    inProgressList.innerHTML = '';
    completedList.innerHTML = '';

    // Populate the 'Still Needed' section
    courseData.stillNeeded.forEach(requirement => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>Requirement:</strong> ${requirement.name}<br>`;
        
        // Only add context if it's not empty
        if (requirement.context && requirement.context !== "No additional context") {
            li.innerHTML += `<em>Context:</em> ${requirement.context}<br>`;
        }
        
        // Display each option within the requirement
        requirement.options.forEach(option => {
            const optionLi = document.createElement('ul');
            optionLi.innerHTML = `<strong>Option:</strong> ${option.name}<br>`;

            // Only add context if it's not empty
            if (option.context && option.context !== "No additional context") {
                optionLi.innerHTML += `<em>Context:</em> ${option.context}<br>`;
            }

            option.subRequirements.forEach(subReq => {
                const subReqLi = document.createElement('li');
                subReqLi.innerHTML = `
                    <strong>Name:</strong> ${subReq.name}<br>
                    <strong>Quantity:</strong> ${subReq.quantity}<br>
                    <strong>Course Type:</strong> ${subReq.courseType}<br>
                    <strong>Status:</strong> ${subReq.status}
                `;
                optionLi.appendChild(subReqLi);
            });
            li.appendChild(optionLi);
        });
        stillNeededList.appendChild(li);
    });

    // Populate the 'In Progress' section
    courseData.inProgress.forEach(course => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>Course Code:</strong> ${course.course}<br>
            <strong>Title:</strong> ${course.title}<br>
            <strong>Credits:</strong> ${course.credits}
        `;
        inProgressList.appendChild(li);
    });

    // Populate the 'Completed' section with only fully completed courses
    courseData.completed.forEach(course => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>Course Code:</strong> ${course.courseCode}<br>
            <strong>Course:</strong> ${course.course}<br>
            <strong>Title:</strong> ${course.title}<br>
            <strong>Grade:</strong> ${course.grade}<br>
            <strong>Credits:</strong> ${course.credits}
        `;
        completedList.appendChild(li);
    });
}

// Function to extract 'Still Needed' courses in JSON format
function extractStillNeededCourses() {
    const stillNeeded = [];
    const rows = document.querySelectorAll('.MuiTableRow-root');

    let currentRequirement = null;
    let currentOption = null;

    rows.forEach(row => {
        const isTopLevel = row.querySelector('th .MuiTypography-body2');
        const isOption = row.querySelector('td p');
        const isSubRequirement = row.querySelector('.jssY4_8hi66o-3332');
        const isIncomplete = row.querySelector('svg[aria-label="Not complete"]');
        const contextInfo = row.querySelector('td:last-child span')?.innerText.trim() || "";

        if (isTopLevel && isIncomplete && !isOption) {
            const requirementName = isTopLevel.innerText.trim();
            if (currentRequirement) stillNeeded.push(currentRequirement);
            currentRequirement = {
                name: requirementName,
                status: "Incomplete",
                context: contextInfo || "No additional context",
                options: []
            };
        } else if (isOption && currentRequirement && isIncomplete) {
            const optionName = row.querySelector('.MuiTypography-body2').innerText.trim();
            const optionContext = contextInfo || "No additional context";
            currentOption = { name: optionName, status: "Incomplete", context: optionContext, subRequirements: [] };
            currentRequirement.options.push(currentOption);
        } else if (isSubRequirement && currentOption && isIncomplete) {
            const subRequirementName = row.querySelector('.jssY4_8hi66o-3332').innerText.trim();
            const quantity = row.querySelector('.jssY4_8hi66o-3376')?.innerText.trim() || "N/A";
            const courseType = row.querySelector('.jssY4_8hi66o-3386 p span')?.innerText.trim() || "N/A";
            currentOption.subRequirements.push({
                name: subRequirementName,
                quantity: quantity,
                courseType: courseType,
                status: "Still needed"
            });
        }
    });

    if (currentRequirement) stillNeeded.push(currentRequirement);
    return stillNeeded;
}

// Function to scrape 'In Progress' courses in JSON format
function scrapeInProgressCourses() {
    const inProgressCourses = [];
    const headings = document.querySelectorAll('h2.MuiTypography-h2');
    let inProgressSection = null;

    headings.forEach((heading) => {
        if (heading.textContent.trim() === "In-progress") inProgressSection = heading;
    });

    if (inProgressSection) {
        const courseTableBody = inProgressSection.closest('.MuiAccordionSummary-root').nextElementSibling?.querySelector('.MuiTableBody-root');
        if (courseTableBody) {
            const courseRows = courseTableBody.querySelectorAll('tr');
            courseRows.forEach((row) => {
                const course = row.querySelector('td:nth-of-type(1) p')?.innerText.trim() || "N/A";
                const title = row.querySelector('td:nth-of-type(2) p')?.innerText?.trim() || "N/A";
                const credits = row.querySelector('td:nth-of-type(4) p')?.innerText?.trim() || "N/A";
                inProgressCourses.push({ course, title, credits });
            });
        }
    }
    return inProgressCourses;
}

// Function to scrape 'Completed' courses in JSON format
function scrapeCompletedCourses() {
    const completedCourses = [];
    const courseCodes = new Set(); // Set to track unique course codes and avoid duplicates

    // Helper function to check if a row is part of an excluded section
    function isExcludedSection(row) {
        const sectionHeading = row.closest('div.MuiPaper-root')?.querySelector('h2');
        if (sectionHeading) {
            const headingText = sectionHeading.innerText.toLowerCase();
            return headingText.includes("insufficient grades") || headingText.includes("over the limit");
        }
        return false;
    }

    // Primary scraping of completed courses
    const courseRows = document.querySelectorAll('tr[class*="MuiTableRow-root"]');
    courseRows.forEach((row) => {
        if (isExcludedSection(row)) return; // Skip if part of excluded section

        const isComplete = row.querySelector('svg.ds-icon[aria-label="Requirement is complete"]');
        if (isComplete) {
            const courseCode = row.querySelector('td:nth-of-type(1) p')?.innerText.trim() || "N/A";
            if (!courseCodes.has(courseCode)) {
                const course = row.querySelector('th p')?.textContent?.split(' Requirement is complete')[0]?.trim() || "N/A";
                const title = row.querySelector('td:nth-of-type(2) p')?.innerText?.trim() || "N/A";
                const grade = row.querySelector('td:nth-of-type(3) p')?.innerText?.trim() || "N/A";
                const credits = row.querySelector('td:nth-of-type(4) p')?.innerText?.trim() || "N/A";
                
                completedCourses.push({ courseCode, course, title, grade, credits });
                courseCodes.add(courseCode); // Track course code to avoid duplicates
            }
        }
    });

    // Secondary scraping for any missed courses in the identified section
    const secondaryRows = document.querySelectorAll('tbody.MuiTableBody-root tr');
    secondaryRows.forEach((row) => {
        if (isExcludedSection(row)) return; // Skip if part of excluded section

        const courseCode = row.querySelector('td:nth-of-type(1) p')?.innerText.trim() || "N/A";
        if (!courseCodes.has(courseCode) && courseCode !== "N/A") { // Only add if it's new and valid
            const course = row.querySelector('th p')?.textContent?.split(' Requirement is complete')[0]?.trim() || "N/A";
            const title = row.querySelector('td:nth-of-type(2) p')?.innerText?.trim() || "N/A";
            const grade = row.querySelector('td:nth-of-type(3) p')?.innerText?.trim() || "N/A";
            const credits = row.querySelector('td:nth-of-type(4) p')?.innerText?.trim() || "N/A";
            
            completedCourses.push({ courseCode, course, title, grade, credits });
            courseCodes.add(courseCode); // Track course code to avoid duplicates
        }
    });

    return { completedCourses };
}



// Function to collect all course data for display and only course codes for GPT prompt
function collectCourseData() {
    const { completedCourses } = scrapeCompletedCourses();
    const inProgressCourses = scrapeInProgressCourses();
    const stillNeeded = extractStillNeededCourses();

    // Prepare course codes only for GPT
    const completedCourseCodes = completedCourses.map(course => course.courseCode);
    const inProgressCourseCodes = inProgressCourses.map(course => course.course);

    return {
        displayData: {
            stillNeeded: stillNeeded,
            inProgress: inProgressCourses,
            completed: completedCourses
        },
        courseCodesForGPT: {
            completedCourses: completedCourseCodes,
            inProgressCourses: inProgressCourseCodes,
            stillNeeded: stillNeeded // adding full 'still needed' JSON
        }
    };
}

// Function to create course plan by sending only course codes to ChatGPT
async function createCourseplan() {
    const bulletinData = {
        "ISBA_Requirements": {
          "Lower_Division_Requirements": {
            "total_credits": 27,
            "courses": [
              { "code": "BCOR 1910", "title": "Business for Good", "credits": 2, "category": null, "prerequisites": [], "Core": [] },
              { "code": "BCOR 2110", "title": "Financial Accounting", "credits": 4, "category": null, "prerequisites": [{ "required": "BCOR 1910" }, { "anyOf": ["MATH 112", "MATH 120", "MATH 131"] }], "Core": [] },
              { "code": "BCOR 2120", "title": "Accounting Information for Decision Making", "credits": 4, "category": null, "prerequisites": [{ "required": "BCOR 2110" }, { "anyOf": ["MATH 112", "MATH 120", "MATH 131"] }], "Core": ["Flag: Information Literacy"] },
              { "code": "BCOR 2210", "title": "Legal Environment of Business", "credits": 2, "category": null, "prerequisites": [{ "required": "BCOR 1910" }], "Core": [] },
              { "code": "BCOR 2710", "title": "Business Information Technology", "credits": 4, "category": null, "prerequisites": [{ "required": "BCOR 2110" }], "Core": [] },
              { "code": "ECON 1050", "title": "Introductory Economics", "credits": 4, "category": null, "prerequisites": [], "Core": [] },
              { "code": "ECON 2300", "title": "Introductory Statistics", "credits": 4, "category": null, "prerequisites": [], "Core": [] },
              { "code": "MATH 112", "title": "Calculus for Business", "credits": 3, "category": null, "prerequisites": [], "Core": [] }
            ]
          },
          "Upper_Division_Requirements": {
            "total_credits": 28,
            "courses": [
              { "code": "BCOR 3410", "title": "Fundamentals of Finance", "credits": 4, "category": null, "prerequisites": [{ "required": "BCOR 2110" }, { "anyOf": ["ECON 1050", { "allOf": ["ECON 1100", "ECON 1200"] }] }, { "anyOf": ["ECON 2300", "ECON 2350", "MATH 104"] }, { "anyOf": ["MATH 112", "MATH 131"] }], "Core": [] },
              { "code": "BCOR 3510", "title": "Marketing and Business Communications", "credits": 4, "category": null, "prerequisites": [{ "required": "BCOR 1910" }, { "anyOf": ["ECON 1050", { "allOf": ["ECON 1100", "ECON 1200"] }] }], "Core": [] },
              { "code": "BCOR 3610", "title": "Managing People and Organizations", "credits": 4, "category": null, "prerequisites": [{ "required": "BCOR 1910" }], "Core": ["Flag: Engaged Learning"] },
              { "code": "BCOR 4910", "title": "Business Ethics and Sustainability", "credits": 4, "category": null, "prerequisites": [{ "allOf": ["BCOR 2710", "BCOR 3410", "BCOR 3510", "BCOR 3610"] }], "Core": ["Integrations: Ethics and Justice", "Flag: Writing"] },
              { "code": "BCOR 3750", "title": "Analytics in Operations and Supply Chain Management", "credits": 4, "category": "Quantitative Methods for Business", "prerequisites": [{ "anyOf": ["ACCT 3140", "BCOR 2710", "BCOR 2720"] }, { "anyOf": ["ECON 2300", "MATH 104"] }, { "required": "MATH 112" }], "Core": ["Flag: Quantitative Reasoning"] },
              { "code": "BCOR 3860", "title": "International Business", "credits": 4, "category": "International/Global Awareness", "prerequisites": [{ "anyOf": ["ECON 1050", { "allOf": ["ECON 1100", "ECON 1200"] }] }], "Core": [] },
              { "code": "BCOR 4970", "title": "Strategic Management", "credits": 4, "category": "Strategic Business Integrations", "prerequisites": [{ "allOf": ["BCOR 3410", "BCOR 3510", "BCOR 3610"] }], "Core": [] }
            ]
          },
          "ISBA_Major_Requirements": {
            "total_credits": 28,
            "required_courses": [
              { "code": "ISBA 3710", "title": "Database Management Systems", "credits": 4, "category": null, "prerequisites": [{ "anyOf": ["AIMS 2710", "BCOR 2710", "ACCT 3140"] }], "Core": [] },
              { "code": "ISBA 4797", "title": "Capstone Project", "credits": 4, "category": null, "prerequisites": [{ "allOf": [{ "required": "ISBA 3710" }, { "required": "ISBA 3750" }, { "anyOf": ["ISBA 3730", "CMSI 1010"] }, { "anyOf": ["ISBA 3720", "ISBA 4796"] }] }, { "waivableIf": "ISBA 4796" }], "Core": [] },
              {
                "anyOf": [
                  {
                    "code": "ISBA 3720",
                    "title": "Systems Analysis and Design",
                    "credits": 4,
                    "category": "Elective or Major Requirement",
                    "prerequisites": [{ "anyOf": ["AIMS 2710", "BCOR 2710"] }],
                    "Core": []
                  },
                  {
                    "code": "ISBA 4796",
                    "title": "Capstone Proposal Development",
                    "credits": 1,
                    "category": "Elective or Major Requirement",
                    "prerequisites": [{ "required": "BCOR 2710" }],
                    "Core": []
                  }
                ]
              }
            ],
            "elective_courses": {
              "minimum_required": 3,
              "credits_per_course": 4,
              "options": [
                { "code": "ISBA 3730", "title": "Programming for Business Applications", "category": "Elective", "prerequisites": [{ "required": "BCOR 2710" }], "Core": [] },
                { "code": "ISBA 4715", "title": "Developing Business Applications Using SQL", "category": "Elective", "prerequisites": [{ "anyOf": ["AIMS 3710", "ISBA 3710"] }], "Core": [] },
                { "code": "ISBA 4740", "title": "Financial Modeling and Analytics", "category": "Elective", "prerequisites": [{ "required": "BCOR 3750" }, { "anyOf": ["BCOR 3410", "FNCE 3400"] }], "Core": [] },
                { "code": "ISBA 4750", "title": "Business Web and App Development", "category": "Elective", "prerequisites": [{ "required": "ISBA 3710" }], "Core": [] },
                { "code": "ISBA 4755", "title": "Introduction to Big Data", "category": "Elective", "prerequisites": [{ "required": "BCOR 2710" }, { "anyOf": ["AIMS 3730", "CMSI 1010"] }], "Core": [] },
                { "code": "ISBA 4760", "title": "Data Visualization and GIS", "category": "Elective", "prerequisites": [{ "required": "BCOR 2710" }], "Core": [] },
                { "code": "ISBA 4770", "title": "Cybersecurity", "category": "Elective", "prerequisites": [{ "required": "BCOR 2710" }], "Core": [] },
                { "code": "ISBA 4775", "title": "Network Cloud Computing", "category": "Elective", "prerequisites": [], "Core": [] },
                { "code": "ISBA 4790", "title": "Machine Learning", "category": "Elective", "prerequisites": [{ "required": "BCOR 2710" }, { "required": "BCOR 3750" }, { "anyOf": ["ISBA 3730", "CMSI 1010"] }], "Core": [] },
                { "code": "ISBA 4798", "title": "Special Studies", "category": "Elective", "prerequisites": [], "Core": [] },
                { "code": "ISBA 4799", "title": "Independent Studies", "category": "Elective", "prerequisites": [], "Core": [] }
              ]
            }
          },
          "Additional_Requirements": {
            "final_hours_at_LMU": 30,
            "upper_division_hours": 45,
            "minimum_overall_gpa": 2.0,
            "major_hours": 71,
            "description": [
              "30 of the last 36 semester hours must be completed at LMU.",
              "A minimum of 45 upper-division semester hours is required.",
              "A minimum overall GPA of 2.0 is required.",
              "A minimum of 71 semester hours are required in the major (BCOR and ISBA courses)."
            ]
          }
        }
      };

    const { displayData, courseCodesForGPT } = collectCourseData();

    const prompt = `
Based on my degree requirements, my completed courses, in-progress courses, and my "still needed" requirements, please determine the courses I still need to complete my degree. Use the following criteria:

1. **Bulletin Structure**: The provided bulletin outlines degree requirements, including lower and upper-division courses, major requirements, and electives. Prerequisites may be defined as choices, such as needing "one of the following" courses to satisfy a requirement. Electives may also require choosing a certain number of courses from specified options.

2. **Still Needed Requirements Format**:
   - The "stillNeeded.json" section outlines remaining requirements and, in some cases, includes **alternative options** to fulfill them.
   - For instance, some requirements offer **two or more options**, such as "Programming Option 1" and "Programming Option 2," where only one of these options needs to be completed to fulfill the requirement. These options are structured as:
       - **Programming Option 1**: Course A, Course B
       - **Programming Option 2**: Course C, Course D
   - Only one option needs to be selected, but each option may include prerequisites or multiple courses.
   - Please note there is a small error, Capstone Project and CBA Advantage points are general requirements, not a subrequirement of Programming Option 2, as shown in the stillneeded json.

3. **Selecting Optimal Options**:
   - When multiple options exist to fulfill a requirement, recommend the option with the **lesser workload** (i.e., fewer courses).
   - However, if some courses in a more extensive option have already been completed, prioritize that option if it has fewer remaining courses to complete.
  
4. **Completed and In-Progress Courses**: Use the list of completed and in-progress courses to determine which requirements are already fulfilled. Compare these with the bulletindata.json to identify any remaining courses to be taken to fulfill all requirements.

Follow this exactly for your output format: 
Return ONLY the courses still needed to fulfill all degree requirements, formatted as:
**Course Code - Course Title**, with very little context other than if it is absolutely required, I have to pay tokens for each message you send so please keep it concise. Also please be sure that there is a recommendation section at the end with all the recommendations lined out clearly.

bulletinData.json:
${JSON.stringify(bulletinData, null, 2)}

stillNeeded.json:
${JSON.stringify(courseCodesForGPT.stillNeeded, null, 2)}

inProgressCourses.json:
${JSON.stringify(courseCodesForGPT.inProgressCourses, null, 2)}

completedCourses.json:
${JSON.stringify(courseCodesForGPT.completedCourses, null, 2)}

Which courses do I need to take to complete my degree, following the guidance on option selection where applicable?
`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer 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`
            },
            body: JSON.stringify({
                model: "gpt-4-turbo",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 4000,
                temperature: 0.5
            })
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log("Response data:", data);

        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            const answer = data.choices[0].message.content.trim();
            document.getElementById("gpt-response").innerText = answer;
        } else {
            throw new Error("Unexpected API response format: missing 'message.content' in response.");
        }
    } catch (error) {
        console.error("Error generating course plan:", error);
        document.getElementById("gpt-response").innerText = "Failed to generate course plan. Please try again.";
    }
}

// Listen for a message from the popup to create the sidebar and scrape courses
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "createSidebarAndScrape") {
        createSidebar();
        const { displayData } = collectCourseData();
        updateSidebar(displayData);
        sendResponse({ status: "success", courseData: displayData });
    }
});
