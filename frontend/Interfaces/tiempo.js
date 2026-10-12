const ranuras=document.querySelectorAll('.save-slot');
const pagButtons=document.querySelectorAll('.pag-num');
const pagTitle=document.querySelectorAll('.pag-title');

let actualPag="1";
function loadPage(pagNumber) {
  actualPag=pagNumber;
  pagTitle.textContent=`Pag. ${pagNumber}`;

  pagButtons.forEach(btn=> {
    if (btn.textContent===pagNumber) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  ranuras.forEach((ranura, indice)=> {
    ranura.addEventListener('click', () => {
      const now = new Date();
      const dateOptions={day: '2-digit', month:'2-digit', year:'numeric'};
      const timeOptions={hour:'2-digit', minute:'2-digit', hour12:true};
      const givenDate = now.toLocaleDateString('es-ES', dateOptions);
      const givenTime = now.toLocaleTimeString('es-ES', timeOptions);
      const finalTime= `${givenDate} ${givenTime}`;

      const timeSlot = ranura.querySelector('.slot-time');
      timeSlot.textContent= finalTime;
      timeSlot.classList.remove('transparent-text');
      ranura.classList.add('filled');
      const msgAlert=ranura.querySelector('.status-message');
      msgAlert.textContent='¡Saved Game!';
      setTimeout(() => {
        msgAlert.textContent= '';
      }, 5000)
      })
      
      const code = `Game_pag${actualPag}_slot${indice}`;
      localStorage.setItem(code, finalTime);

      pagButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const selectedPag=button.textContent;
          loadPage(selectedPag);
        });
      });
      const image = ranura.querySelector('.screenshot-box');
      if(image.classList.contains('empty')) {
        image.classList.remove('empty');
        image.classList.add('filled');
        image.innerHTML=`<img src="vela.png" alt="Game Saved">`;
        ranura.querySelector('.slot-status').textContent=`Saved Game ${indice + 1}`;
      }
    });
}

