import { createRouter, createWebHistory } from 'vue-router'
import NumericInputDemo from '@/views/NumericInputDemo.vue'
import PeopleList from '@/views/PeopleList.vue'
import PersonEdit from '@/views/PersonEdit.vue'
import Settings from '@/views/Settings.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: NumericInputDemo,
    },
    {
      path: '/people',
      name: 'people',
      component: PeopleList,
    },
    {
      path: '/person/:id',
      name: 'person-edit',
      component: PersonEdit,
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings,
    },
  ],
})

export default router
