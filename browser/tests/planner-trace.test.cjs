const planner = require('./src/goal-planner');

const goal = 'login to google, usingthe email, advancing to the next screen and using the password, and clickingin advance';
const inputs = {
  username: 'tboard@hotmail.com',
  password: 'test-password-here'
};

const actions = planner.planGoalActions(goal, inputs);
console.log('Total actions:', actions.length);
actions.forEach((a, i) => {
  console.log(`[${i+1}] ${a.type}: ${a.description} | selector=${a.selector?.substring(0, 80) || 'none'} | value=${a.value ? a.value.substring(0, 20) : 'none'} | target=${a.target?.substring(0, 60) || 'none'}`);
});
