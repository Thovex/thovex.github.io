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
            freelance.textContent = `${project.work} (with release intent)`;
            freelance.style = 'text-align: left; margin-bottom: 1em;';
            headerContainer.appendChild(freelance);
        } else if (project.type === "Hobby") {
            const hobby = document.createElement('p');
            hobby.textContent = `${project.work} (for fun)`;
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
        

        const screenshotContainer = document.getElementById('screenshot-container');
        if (project.screenshots.length > 0) {
            project.screenshots.forEach((screenshot, index) => {
                const carouselItem = document.createElement('div');
                carouselItem.className = 'carousel-item' + (index === 0 ? ' active' : '');

                const img = document.createElement('img');
                img.src = screenshot.src;
                img.alt = screenshot.alt;
                img.className = 'd-block w-100';

                carouselItem.appendChild(img);
                screenshotContainer.appendChild(carouselItem);
            });
        }

        const videoContainer = document.getElementById('video-container');
        if (project.videos.length > 0) {
            project.videos.forEach((video, index) => {
                const carouselItem = document.createElement('div');
                carouselItem.className = 'carousel-item' + (index === 0 ? ' active' : '');

                const vid = document.createElement('video');
                vid.src = video.src;
                vid.alt = video.alt;
                vid.className = 'd-block w-100';
                vid.controls = true;  // Optional: Adds play/pause and other controls to the video

                // Setting properties directly
                vid.playsInline = true;
                vid.autoplay = true;
                vid.muted = true;
                vid.loop = true;

                carouselItem.appendChild(vid);
                videoContainer.appendChild(carouselItem);
            });
        }

    }
});
