document.addEventListener("DOMContentLoaded", function () {
    // Get the project ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    if (projectId) {
        fetch('projects.json')
            .then(response => response.json())
            .then(data => {
                const project = data.find(proj => proj.id === projectId);
                if (project) {
                    populateProjectDetails(project);
                } else {
                    document.getElementById('project-details').innerHTML = '<p>Project not found.</p>';
                }
            })
            .catch(error => console.error("Error fetching project data:", error));
    } else {
        document.getElementById('project-details').innerHTML = '<p>No project specified.</p>';
    }

    function populateProjectDetails(project) {
        const projectHeader = document.getElementById('project-header');
        const headerContainer = document.createElement("div");

        const title = document.createElement('h1');
        title.id = 'project-title';
        title.textContent = project.title;
        title.style = 'text-align: left; margin: 1em 0;';

        const description = document.createElement('p');
        description.textContent = project.longdescription;
        description.style = 'text-align: left; margin-bottom: 1em;';

        headerContainer.appendChild(title);
        headerContainer.appendChild(description);

        if (project.type === "BSS") {
            const employment = document.createElement('p');
            employment.textContent = `Employed as ${project.role}`;
            employment.style = 'text-align: left; margin-bottom: 1em;';
            headerContainer.appendChild(employment);
        } else if (project.type === "BH") {
            const freelance = document.createElement('p');
            if (Array.isArray(project.work)) {
                freelance.textContent = project.work.map(item => item.title).join(', ');
            } else {
                freelance.textContent = project.work;
            }
            
            freelance.style = 'text-align: left; margin-bottom: 1em;';
            headerContainer.appendChild(freelance);
        } else if (project.type === "Hobby") {
            const hobby = document.createElement('p');
            if (Array.isArray(project.work)) {
                hobby.textContent = project.work.map(item => item.title).join(', ');
            } else {
                hobby.textContent = project.work;
            }
            
            hobby.style = 'text-align: left; margin-bottom: 1em;';
            headerContainer.appendChild(hobby);
        }

        if (project.socials.length > 0) {
            const socials = document.createElement('div');
            socials.className = 'project-card-socials';
            socials.style = 'margin: 25px 0; padding: 0px;';
            project.socials.forEach(social => {
                const socialContainer = document.createElement('div');
                socialContainer.className = 'project-card-socials-container';
                socialContainer.style = 'display: flex; flex-direction: row; align-items: center; margin: 0px; padding: 10px 0; border-radius: 5px;';

                const socialLink = document.createElement('a');
                socialLink.style = 'text-decoration: none; display: flex; flex-direction: row; align-items: center; margin: 0px; padding: 5px 15px; cursor: pointer';
                socialLink.href = social.url;
                socialLink.rel = 'noopener noreferrer';

                const socialText = document.createElement('p');
                socialText.textContent = social.info;
                socialText.className = 'project-card-socials-text';
                socialText.style = 'margin: 5px; padding: 5px; cursor: pointer';

                if (social.icon !== "") {
                    const socialIcon = document.createElement('img');
                    socialIcon.src = social.icon;
                    socialIcon.style = 'width: 24px; height: auto; margin: 5px 10px 0px 0px; padding: 0px; cursor: pointer; display:block';
                    socialIcon.alt = social.name;
                    socialIcon.className = 'project-card-socials-icon';
                    socialLink.appendChild(socialIcon);
                } else {
                    const socialWhitespace = document.createElement('div');
                    socialWhitespace.style = 'width: 24px; height: 24px; margin: 5px 10px 0px 0px; padding: 0px';
                    socialWhitespace.className = 'project-card-socials-icon';
                    socialLink.appendChild(socialWhitespace);
                }

                socialLink.appendChild(socialText);
                socialContainer.appendChild(socialLink);
                socials.appendChild(socialContainer);
            });

            headerContainer.appendChild(socials);
            headerContainer.className = 'project-header-container';
        }

        projectHeader.appendChild(headerContainer);

        const bannerContainer = document.getElementById('banner-container');
        const banner = document.createElement('img');
        banner.src = `${project.banner}`;
        banner.alt = `${project.title} Banner`;
        banner.className = 'banner-image';
        bannerContainer.appendChild(banner);

        const projectWork = document.getElementById('project-work');
        const workNote = document.createElement('p');
        workNote.textContent = "Note. only features I am involved with directly are listed.";
        workNote.style = 'font-style: italic; margin-bottom: 1em; text-align: left;';
        projectWork.appendChild(workNote);

        const workList = document.createElement('ul');
        project.work.forEach((workItem) => {
            const workListItem = document.createElement('li');
            if (typeof workItem === 'object') {
                const workTitle = document.createElement('strong');
                workTitle.textContent = workItem.title;
                workListItem.appendChild(workTitle);
                
                const workDescription = document.createElement('p');
                workDescription.textContent = workItem.description;
                workDescription.style = 'margin-bottom: 1em; text-align: left;';
                workListItem.appendChild(workDescription);
            } else {
                workListItem.textContent = workItem;
            }
            workList.appendChild(workListItem);
        });
        projectWork.appendChild(workList);
        
        if (!project.screenshots && !project.videos) {
            const mediaContainer = document.getElementById('media-container');
            mediaContainer.style = 'display: none;';
        }
        
        const mediaGrid = document.getElementById('media-grid');
        
        // Handle screenshots
        if (project.screenshots && project.screenshots.length > 0) {
            project.screenshots.forEach((screenshot) => {
                const img = document.createElement('img');
                img.src = screenshot.src;
                img.alt = screenshot.alt;
                img.style = 'width: 100%; height: auto; object-fit: cover;';
                img.className = 'media-item'; // Optional class for styling
        
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridItem.appendChild(img);
        
                mediaGrid.appendChild(gridItem);
            });
        }
        
        // Handle videos
        if (project.videos && project.videos.length > 0) {
            project.videos.forEach((video) => {
                const vid = document.createElement('video');
                vid.src = video.src;
                vid.alt = video.alt;
                vid.style = 'width: 100%; height: auto; object-fit: cover;';
                vid.controls = true;  // Optional: Adds play/pause and other controls
                vid.playsInline = true;
                vid.autoplay = true;
                vid.muted = true;
                vid.loop = true;
                vid.className = 'media-item'; // Optional class for styling
        
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridItem.appendChild(vid);
        
                mediaGrid.appendChild(gridItem);
            });
        }
    }
});
