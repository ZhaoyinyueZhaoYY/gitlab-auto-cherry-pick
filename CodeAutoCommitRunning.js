/*
    ---23.08.17---
    1、点击合并的时候校验每个分支数量够不够，够的跳过并显示成功，将每个commit状态设置为success,不够的取localStorage，跳过'success'和'cherry-picked'的commit,其他的重新执行
    2、不够的进行合并，记录状态，状态分为：success、failure、conflict,非success记录msg，记入localStrorage
    3、添加检查按钮，校验每个分支数量够不够，够的跳过并显示成功，将每个commit状态设置为success，所有都成功后设置隐藏控件值，
       可以点发送按钮。分支缺少commit时提示数量需要用户去确认

    ---23.08.21---
    1、merge requests 时设置remove_source_branch为true，在合并成功后删除临时分支
    2、在cherry-pick失败的时候删除临时分支
*/ 
(function () {
    function gitAutoMQ() {
        var metaData = csdk.core.getMetaData(); //获取metaData
        return {
            type: 'raw',
            plugin: {
                install: function () {
                },
                requiredAssert: function (data) {
                    if (data.isNotNull == 1 && data.value == '') return false;
                    return true;
                }
            },
            implement: {
                config: {
                    headers: {
                        'Content-Type': 'application/json',
                        'Private-Token': ''
                    },
                },
                mergeProcess:null,
                theKeyBranch:'',
                codeAutoCommitId:'',
                tokenExpired:false,
                targetBranch:[],
                targetCommits:[],
                init: function (context, container) {
                    var ctx = this;

                    var ctrlTitleStyle = ctx.$data.ctrlTitleStyle;//是否显示标题
                    var result = '';
                    switch (ctrlTitleStyle) {
                        case 'linewrap':
                            result = 'is-two';
                            break;
                        case 'inline':
                            result = 'is-one';
                            break;
                        case 'none':
                            result = 'is-none';
                            break;
                        default:
                            break;
                    }
                    var el = document.createElement('section');
                    var showValue = ctx.$data.showValue;
                    //此处HTML �?要根据需求自行组�? todo
                    // todo 隐藏 ctx.$data.auth === 'browse'  ctx.$data.auth === 'hide'
                    // todo 编辑 ctx.$data.auth === 'edit'
                    // todo 穿�?? ctx.$data.relationData && ctx.$data.relationData.imgShow === '1'

                    var showHTML = '';
                    showHTML += '<section class="cap4-text ' + result + '">';
                    showHTML += '<link href="https://cdn.bootcdn.net/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.css" rel="stylesheet" />';
                    showHTML += '<div class="cap4-text__right field-content-wrapper is-relation">';
                    showHTML += '<div class="cap4-text__cnt field-content" >'
                    showHTML += '<input type="text" id="gitInput" class="is-relatinbrowse" placeholder="请输入gitlab账户绑定的AccessToken" ' + this.$data.id + '" value="' + showValue + '">'
                    showHTML += '<button style="width: 40px;line-height: 28px;" id="gitButton">合并</button>'
                    showHTML += ' </div>'
                    showHTML += '</div>';
                    showHTML += '</section>';
                    el.innerHTML = showHTML;
                    var script = document.createElement('script');
                    script.src = 'https://unpkg.com/axios/dist/axios.min.js';
                    el.appendChild(script);
                    var script1 = document.createElement('script');
                    script1.src = 'https://cdn.bootcdn.net/ajax/libs/jquery-toast-plugin/1.3.2/jquery.toast.min.js';
                    el.appendChild(script1);
                    container.innerHTML = '';
                    container.appendChild(el);
                    setTimeout(function () {
                        var privateToken = localStorage.getItem('Private-Token');
                        if (privateToken) {
                            document.querySelector('#gitInput').value = privateToken;
                        }
                        if (csdk && csdk.core && csdk.core.relayout)
                            csdk.core.relayout();
                    }, 0);
                    ctx.$el = el;
                    var btnEL = el.querySelector('#gitButton');
                    // 绑定事件
                    ctx.$on(btnEL, 'click', function (event) {
                        ctx.handle();
                    });

                    this.codeAutoCommitId='CodeAutoCommit'+this.parseQuery(window.location.search)?.affairId

                    const { formmains, formsons, metadata } = window.csdk.core.getFormData();
                    let records=formsons.front_formson_1.records
                    if(records&&records.length>0){
                        let keyBranchFormData=records[records.length-1]
                        this.theKeyBranch=keyBranchFormData&&Object.values(keyBranchFormData.lists)[0].value
                    }
                    this.mergeProcess=JSON.parse(localStorage.getItem(this.codeAutoCommitId))
                    if(!this.mergeProcess)this.mergeProcess={}

                },
                update: function () {
                    // this.init();
                },
                destroy: function () {
                    this.$el = null;
                },
                afterSave: function () {
                    localStorage.removeItem(this.codeAutoCommitId)
                },
                setFieldState: function (id, value) {
                    csdk.core.setFieldData({
                        fieldId: id,
                        fieldData: {
                            value
                        }
                    })
                },
                parseQuery(str) {
                    const obj = {};
                    str.split('&').forEach((item) => {
                      const array = item.split('=');
                      obj[array[0]] = decodeURIComponent(array[1]);
                    });
                    return obj;
                },
                revertTable: function () {
                    const { formmains, formsons, metadata } = window.csdk.core.getFormData();
                    const children = metadata.viewInfo.viewContent.children.slice(5);
                    const table = children.reduce((prev, next) => {
                        const tr = Object.keys(next.buildCells || {}).reduce((p, n) => {
                            const value = next.buildCells[n].children[0];
                            const sp = n.split(/[a-z]+/g).slice(1);
                            if (!value) return p;
                            if (!p[sp[0]]) {
                                p[sp[0]] = [];
                            }
                            if (value.type === "select") {
                                p[sp[0]][sp[1]] = formmains.formmain_76266[value.id].showValue
                            } else {
                                p[sp[0]][sp[1]] = value.display;
                            }
                            p[sp[0]][4] = value.id;
                            return p;
                        }, []);
                        return prev.concat(tr)
                    }, []).filter(i => {
                        return i[0] && i[0].startsWith("V")
                    });
                    return table;
                },
                getCommit: function (chooseCommit,keyBranch) {
                    const { formmains, formsons, metadata } = window.csdk.core.getFormData();
                    return formsons.front_formson_1.records.map(i => {
                        // if(!chooseCommit.map(({branch})=>branch).includes(Object.values(i.lists)[0].value)) {
                        //     return null;
                        // }
                        var href = Object.values(i.lists).find(ii => {
                            return ii.value.includes('/commit/')
                        })?.value;
                        return href && Object.values(i.lists)[0].value===keyBranch&&{
                            path: href.match(/(?<=gitlab.*******.com\/).*(?=\/-\/)/g)[0],
                            commit: href.split('/').pop(),
                        }
                    }).filter(iii => {
                        return !!iii
                    });
                },
                checkBranchCommit(checkBranch){
                    const branchCommits=this.getCommit(this.targetBranch,checkBranch)
                    return branchCommits.length===this.targetCommits.length
                },
                handle: function () {
                    const privateToken = document.querySelector('#gitInput').value;
                    if (!privateToken) {
                        $.alert(`请输入gitlab账户绑定的AccessToken! \r1、在登录gitlab后，点击右上角的头像，选择 "Preferences"。\n2、在左侧导航栏中，选择 "访问令牌（Access Tokens）" 。\n3、输入 AccessToken 的名称并选择token有效时间（不选则永久有效），token范围全选（其中包含api，read_user，read_api，read_repository，write_repository）。\n4、点击 "创建个人访问令牌（Create personal access token）" 按钮，将生成的 AccessToken 复制并填入输入框。`);
                        return
                    };
                    localStorage.setItem('Private-Token', privateToken);
                    this.config.headers['Private-Token'] = privateToken
                    this.targetBranch = this.revertTable().filter(i => i[2] === "是").map(i =>{
                        return { branch: i[1], id: i[4] }
                        }
                    );
                    if(!this.targetBranch.length){
                        $.alert('请选择要合并的分支！（要合并的分支选择=>是）');
                        return;
                    }
                    this.targetCommits = this.getCommit(this.targetBranch,this.theKeyBranch);
                    // this.targetCommits = [
                    //     {
                    //         "path": "cap/cap-front",
                    //         "commit": "1afe0ef474913ee200b1cb2c12b0b2ca8e8bb555"
                    //     },
                    // ]
                    if (!(this.targetCommits && this.targetCommits.length)) {
                        $.alert('没有可合并分支');
                        return;
                    };
                    const commitList = this.targetBranch.map(({ branch, id }) => ({ branch, commits:this.targetCommits, id }))
                    // [
                    //     {
                    //         "branch": "standard-V8.2-hotfix_20230531",
                    //         "commits": [
                    //             {
                    //                 "path": "cap/cap-front",
                    //                 "commit": "1afe0ef474913ee200b1cb2c12b0b2ca8e8bb555"
                    //             }
                    //         ],
                    //         "id": "field0098"
                    //     },
                    // ]
                    this.requestArr(commitList);
                },
                requestArr: function (commitList) {
                    const commit = commitList.pop();
                    if (!commit) {
                        localStorage.setItem(this.codeAutoCommitId, JSON.stringify(this.mergeProcess));
                        document.querySelector('div[title=刷新关联]').click();
                        return;
                    };
                    // 如果数量匹配判断已经合并完成
                    if(this.checkBranchCommit(commit.branch)){
                        this.setFieldState(commit.id,'成功')
                        commit.commits.forEach((i)=>{
                            this.mergeProcess[commit.branch+'++'+i.commit+'++'+i.path]='success'
                        })
                        return this.requestArr(commitList)
                    }
                    this.gitCherryPick(commit)
                    .catch(e=>{
                    })
                    .finally((e)=>{
                        let finishBranch=Object.keys(this.mergeProcess).filter(i=>i.includes(commit.branch))
                        let finishBranchCount=0
                        let failMsg=''
                        finishBranch.forEach(i=>{
                            let theCommit =  i.split('++')[1]
                            let thePath =  i.split('++')[2]
                            let failReason={
                                'conflict':'冲突',
                                'falilure':'其他',
                            }
                            if(this.mergeProcess[i]==='success'||this.mergeProcess[i]==='cherry-picked'){
                                finishBranchCount+=1
                            } else {
                                failMsg+=`失败${failReason[this.mergeProcess[i]]?'：'+failReason[this.mergeProcess[i]]:''}，源commit:${theCommit.slice(0,7)},工程:${thePath},分支:${commit.branch}。`
                            }
                        })
                        if(finishBranchCount===finishBranch.length){
                            this.setFieldState(commit.id,`成功`);
                        }else{
                            this.setFieldState(commit.id,failMsg);
                        }
                        this.requestArr(commitList)
                    })
                },
                gitCherryPick:async function(data){
                        // {
                        //         "branch": "standard-V8.2-hotfix_20230531",
                        //         "commits": [
                        //             {
                        //                 "path": "cap/cap-front",
                        //                 "commit": "1afe0ef474913ee200b1cb2c12b0b2ca8e8bb555"
                        //             }
                        //         ],
                        //         "id": "field0098"
                        //     }
                    let theToast=$.toast({
                        heading: '正在合并',
                        text: '当前处理的分支：【' + data.branch + "】  耐心等待！",
                        position: {left:"100px",top:'50%'}, 
                    })
                    const splitArr =  data.commits.filter(i=>{
                        return this.mergeProcess[data.branch+'++'+i.commit+'++'+i.path]!=='success'&&this.mergeProcess[data.branch+'++'+i.commit+'++'+i.path]!=='cherry-picked'
                    })
                    .map(async (item)=>{
                        
                        let eachCherryPickData={...item,branch:data.branch,id:data.id}
                        // {
                        //     "path": "cap/cap-front",
                        //     "commit": "1afe0ef474913ee200b1cb2c12b0b2ca8e8bb555",
                        //     "branch": "standard-V8.2-hotfix_20230414",
                        //     "id": "field0099"
                        // }
                        // 
                        // 一、创建临时分支，如果已存在的话删除重新创建
                        try{
                            console.log('getBranch')
                            await this.getBranch(eachCherryPickData)
                            console.log('deleteBranch')
                            await this.deleteBranch(eachCherryPickData)
                        } catch ({response}) {
                            if (response&&response.status === 401) {
                                theToast.reset()
                                if(this.tokenExpired===false){
                                    $.alert(' token 失效');
                                }
                                this.tokenExpired=true
                            }
                            // return Promise.reject({process:0})
                        }
                        try{
                            console.log('postBranch')
                            await this.postBranch(eachCherryPickData)
                        } catch (err) {
                            console.log(err)
                            return Promise.reject({process:1})
                        }
                        // 二、cherry_pick
                        let commitMsg = undefined
                        try{
                            console.log('cherry_pick')
                            const res=await this.cherry_pick(eachCherryPickData)
                            this.mergeProcess[eachCherryPickData.branch+'++'+eachCherryPickData.commit+'++'+eachCherryPickData.path]='success'
                            commitMsg = res.data.title;
                        } catch ({ response: { data: { message,error_code } } }) {
                            let mergeProcessKey=data.branch+'++'+eachCherryPickData.commit+'++'+eachCherryPickData.path
                            if (error_code==='conflict') {
                                this.mergeProcess[mergeProcessKey]='conflict'
                                if(!this.mergeProcess.errorMessage)this.mergeProcess.errorMessage={}
                                this.mergeProcess.errorMessage[mergeProcessKey]=message + ' Code:' + error_code
                                // 失败的时候删除临时分支
                                await this.getBranch(eachCherryPickData)
                                await this.deleteBranch(eachCherryPickData)
                                return Promise.reject({process:2})
                            }else if(message.includes('cherry-picked')){
                                this.mergeProcess[mergeProcessKey]='cherry-picked'
                                if(!this.mergeProcess.errorMessage)this.mergeProcess.errorMessage={}
                                this.mergeProcess.errorMessage[mergeProcessKey]=message + ' Code:cherry-picked'
                                // 失败的时候删除临时分支
                                await this.getBranch(eachCherryPickData)
                                await this.deleteBranch(eachCherryPickData)
                            }else {
                                this.mergeProcess[mergeProcessKey]='falilure'
                                if(!this.mergeProcess.errorMessage)this.mergeProcess.errorMessage={}
                                this.mergeProcess.errorMessage[mergeProcessKey]=message + ' Code:falilure'
                                // 失败的时候删除临时分支
                                await this.getBranch(eachCherryPickData)
                                await this.deleteBranch(eachCherryPickData)
                                return Promise.reject({process:2})
                            }
                        }
                        // 三、mergeRequest
                        try{
                            console.log('mergeRequest')
                            await commitMsg&&this.mergeRequest(eachCherryPickData, commitMsg)
                        } catch (err) {
                            console.log(err)
                            return Promise.reject({process:3})
                        }
                    })
                    return Promise.all(splitArr)
                },
                getCommitInfo: function (sha) {
                    return axios.get(`https://gitlab.*******.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/commits/${sha}`, this.config).then(console.log)
                },
                nameBranch: function (data) {
                    return data.branch + '_' + data.commit;
                },
                getRepositoryPath: function (data) {
                    return data.path.replace(/\//, '%2F');
                },
                getRepositoryPathByCommit: function (commit) {
                    return commit.path.replace(/\//, '%2F');
                },
                cherry_pick: function (data) {
                    const commit = data.commit;
                    return axios.post(`https://gitlab.*******.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/commits/${commit}/cherry_pick`, { branch: this.nameBranch(data), sha: commit }, this.config)

                },
                createBranch: function (data) {
                    return axios.get(`https://gitlab.*******.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches/${this.nameBranch(data)}`, this.config)
                    .then(() => {
                        return axios.delete(`https://gitlab.*******.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches/${this.nameBranch(data)}`, this.config)
                        .then(res => this.nameBranch(data))
                    }, rej => this.nameBranch(data))
                    .then((name) => {
                        return axios.post(`https://gitlab.*******.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches`, { branch: this.nameBranch(data), ref: data.branch }, this.config)
                    })
                },
                getBranch:function(data){
                    return axios.get(`https://gitlab.*******.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches/${this.nameBranch(data)}`, this.config)
                },
                deleteBranch:function(data){
                    return axios.delete(`https://gitlab.*******.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches/${this.nameBranch(data)}`, this.config)
                },
                postBranch:function(data){
                    return axios.post(`https://gitlab.*******.com/api/v4/projects/${this.getRepositoryPath(data)}/repository/branches`, { branch: this.nameBranch(data), ref: data.branch }, this.config)
                },
                mergeRequest: function (data, title) {
                    return axios.post(`https://gitlab.*******.com/api/v4/projects/${this.getRepositoryPath(data)}/merge_requests`, { title, target_branch: data.branch, source_branch: this.nameBranch(data),remove_source_branch:true }, this.config)
                }
            }
        };
    }
    csdk.component.register('field_1689672732255', gitAutoMQ);
    // csdk.component.register('field_1685342943954', gitAutoMQ);
})();