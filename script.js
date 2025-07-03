document.addEventListener("DOMContentLoaded", function() {
    fetch('projects.json')
    .then(response => response.json())
    .then(data => {
        populateProjects(data);
    })
    .catch(error => console.error("Error fetching project data:", error));

    function populateProjects(projects) {
        const portfolioSection = document.querySelector('.portfolio');

        projects.forEach(project => {
            if (!project.card) { 
                return;
            } 

            const card = document.createElement('div');
            card.className = 'project-card';
            card.setAttribute('data-language', project.language);
            card.setAttribute('data-datetime', project.datetime);
            card.setAttribute('data-engine', project.engine);
            card.setAttribute('data-role', project.role);
            card.setAttribute('data-type', project.type);

            const title = document.createElement('h1');
            title.textContent = project.title;

            const engine = document.createElement('h2');
            engine.textContent = `${project.engine}, ${project.language}`;

            const role = document.createElement('h2');
            role.textContent = `${project.role}, ${project.duration}`;

            const datetime = document.createElement('h3');
            datetime.textContent = project.datetime;

            const img = document.createElement('img');
            img.src = project.minisrc;
            img.style = 'width: 100%; height: auto; margin:0px; padding:0px; border-radius: 10px;';

            const descriptionHeader = document.createElement('p');
            descriptionHeader.style = "font-weight: bold; margin-top: 10px; padding: 0px;";
            descriptionHeader.textContent = 'Brief >...';

            const description = document.createElement('p');
            description.textContent = project.description;
            description.style = 'padding:0px; margin-left:25px';

            const descriptionHeaderEnder = document.createElement('p');
            descriptionHeaderEnder.style = "font-weight: bold; margin-top: 0px; padding: 0px;";
            descriptionHeaderEnder.textContent = '... };';

            const workHeader = document.createElement('p');
            workHeader.style = "font-weight: bold; margin-top: 10px; padding: 0px;";
            workHeader.textContent = 'My work >...';
            
            const work = document.createElement('p');
            if (Array.isArray(project.work)) {
                work.textContent = project.work.map(item => item.title).join(', ');
            } else {
                work.textContent = project.work;
            }

            work.style = 'padding:0px; margin-left:25px';
            
            const workHeaderEnder = document.createElement('p');
            workHeaderEnder.style = "font-weight: bold; margin-top: 0px; padding: 0px;";
            workHeaderEnder.textContent = '... };';
            

            const socials = document.createElement('div');
            socials.className = 'project-card-socials';
            socials.style = 'display: flex; flex-direction: row; align-items: center; margin: 0px; padding: 0px;min-height:50px;';
            project.socials.forEach(social => {
                const socialContainer = document.createElement('div');
                socialContainer.className = 'project-card-socials-container';
                socialContainer.style = 'display: flex; flex-direction: row; align-items: center; margin: 5px; padding: 5px; border-radius: 5px;';

                const socialLink = document.createElement('a');
                socialLink.style = 'text-decoration: none; display: flex; flex-direction: row; align-items: center; margin: 0px; padding: 0px; cursor: pointer';
                socialLink.href = social.url;
                socialLink.rel = 'noopener noreferrer';

                const socialText = document.createElement('p');
                socialText.textContent = social.info;
                socialText.className = 'project-card-socials-text';
                socialText.style = 'margin: 0px; padding: 0px; cursor: pointer';

                if (social.icon != "") {
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

            const headerDiv = document.createElement('div');
            headerDiv.className = 'project-card-header';
            headerDiv.appendChild(title);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'project-card-content';

            contentDiv.appendChild(role);
            contentDiv.appendChild(engine);
            contentDiv.appendChild(datetime);

            contentDiv.appendChild(descriptionHeader);
            contentDiv.appendChild(description);
            contentDiv.appendChild(descriptionHeaderEnder);

            contentDiv.appendChild(workHeader);
            contentDiv.appendChild(work);
            contentDiv.appendChild(workHeaderEnder);

            card.appendChild(headerDiv);
            card.appendChild(contentDiv);
            card.appendChild(img);
            card.appendChild(socials);

            card.addEventListener('click', function() {
                window.location.href = `project?id=${project.id}`;
            });
            
            portfolioSection.appendChild(card);
        });

        const otherList = document.getElementById('other-projects');

        projects.forEach(project => {
            if (project.card) { 
                return;
            } 

            const listItem = document.createElement('li');
            // eNsure list item is leftside
            listItem.style = 'text-align: left; padding-bottom:15px;';

            listItem.innerHTML = `<a href="${project.archive}">${project.datetime}</a> - ${project.title} (${project.engine}, ${project.language})`;
            listItem.innerHTML += '<br>';
            listItem.innerHTML += `${project.description}`;

            otherList.appendChild(listItem);

        });

        // Attach event listeners for filters
        attachFilterListeners();

        
    }

    function toggleResetButtonVisibility(selectElement, resetButtonElement) {
        if (selectElement.value !== 'all') {
            resetButtonElement.style.display = 'inline-block';
        } else {
            resetButtonElement.style.display = 'none';
        }
    }

    function attachFilterListeners() {
        const languageFilter = document.getElementById('languageFilter');
        const engineFilter = document.getElementById('engineFilter');
        const roleFilter = document.getElementById('roleFilter');
        const typeFilter = document.getElementById('typeFilter');
        const typeDescription = document.getElementById('typeDescription');

        typeFilter.addEventListener('change', function() {
            const selectedValue = this.value;

            let description = '';
            switch (selectedValue) {
                case 'BSS':
                    description = 'Work during my employment at Bright Star Studios ApS as a gameplay programmer';
                    break;
                case 'Zloppy Games':
                    description = 'A shared hobby game studio with my friend, where we work on game projects together';
                    break;
                case 'BH':
                    description = 'My own game studio: Baer & Hoggo as an independent game developer. Either game project prototyping or work on games for release';
                    break;
                case 'HKU':
                    description = 'Projects in single-or team scope during my BSc at the University of the Arts Utrecht';
                    break;
                case 'Hobby':
                    description = 'Side projects with no commercial intent';
                    break;
                default:
                    description = '';
            }

            typeDescription.textContent = description;
        });

        const projectCards = document.querySelectorAll('.project-card');

        function filterProjects() {
            projectCards.forEach(card => {
                const language = card.getAttribute('data-language');
                const engine = card.getAttribute('data-engine');
                const role = card.getAttribute('data-role');
                const type = card.getAttribute('data-type');

                if ((languageFilter.value === 'all' || language === languageFilter.value) &&
                    (engineFilter.value === 'all' || engine === engineFilter.value) &&
                    (roleFilter.value === 'all' || role === roleFilter.value) &&
                    (typeFilter.value === 'all' || type === typeFilter.value)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        languageFilter.addEventListener('change', filterProjects);
        engineFilter.addEventListener('change', filterProjects);
        roleFilter.addEventListener('change', filterProjects);
        typeFilter.addEventListener('change', filterProjects);

        const resetButtons = document.querySelectorAll('.reset-filter');
        resetButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetSelectId = this.getAttribute('data-target');
                const targetSelect = document.getElementById(targetSelectId);

                // Set the select option to "All"
                targetSelect.value = 'all';

                // Trigger the change event (if needed)
                const event = new Event('change', { 'bubbles': true });
                targetSelect.dispatchEvent(event);
            });
        });

        const filterIds = ['languageFilter', 'engineFilter', 'roleFilter', 'typeFilter'];
        for (const filterId of filterIds) {
            const selectFilter = document.getElementById(filterId);
            const resetButton = document.querySelector(`[data-target="${filterId}"]`);

            toggleResetButtonVisibility(selectFilter, resetButton);  // Initialize visibility

            selectFilter.addEventListener('change', function() {
                filterProjects();
                toggleResetButtonVisibility(selectFilter, resetButton);
            });
        }
    }
});
