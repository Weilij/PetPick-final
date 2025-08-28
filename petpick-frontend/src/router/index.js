import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import AdoptionInformation from '../pages/AdoptionInformation.vue'

// Mission
const MissionMain = () => import('../pages/Mission/MissionMain.vue')
const MissionDetail = () => import('../pages/Mission/MissionDetail.vue')
const MissionUpload = () => import('../pages/Mission/MissionUpload.vue')
const MissionApplication = () => import('../pages/Mission/MissionApplication.vue')

//Chat
const Chat = () => import('../pages/Chat/Chat.vue')


//Shop



//Account



//Adopt




export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/adoption-info', name: 'adoptionInfo', component: AdoptionInformation },


    //Chat
    { path: '/chat', name: 'chat', component: Chat },

    // Mission
    { path: '/missions', name: 'missions', component: MissionMain },
    { path: '/missions/:id', name: 'missionDetail', component: MissionDetail },
    { path: '/missions/upload', name: 'missionUpload', component: MissionUpload },
    { path: '/missions/application', name: 'missionApplication', component: MissionApplication },



    //Shop



    //Account
    {path: '/login',name: 'login',component: () => import('@/pages/Auth/Login.vue')}


    //Adopt



  ]
})