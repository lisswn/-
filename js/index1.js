/**
 * Created by mycontent on 2017/7/29.
 */

$(function () {
    //  ws://表示走的是WebSocket协议
    var ws = new WebSocket('ws://127.0.0.1:9009');


    var oDiv = $('#box');
    var em = $('#finish em');
    //设置棋盘的宽高
    var d = 20;
    var count = oDiv.width()/d;
    //保存已下招数变量
    var sum = 0;
    //区分黑白棋子
    var flag = true;

    //用于保存已经生成的棋子的坐标,作为判断某个位置是否已经有棋子的依据,注意数组里面必须初始添加一组数组,否则就无法做出判断
    var pos = [{left:-1,top:-1}];

    // 每当客户端接收到服务器发送过来的消息后，都会触发 onmessage 事件
    ws.onmessage = function (e) {
        console.log(e.data);
        var data = JSON.parse(e.data);
        console.log(typeof data);
        pos = JSON.parse(e.data);

        var num = 0;
        pos.forEach(function (item,index) {
            if ( item.left ) {
                num++;
            }
        });
        sum = num;
        $('#finish span').html(sum);
    }

    //在一进入页面就进行一次post请求的目的是为了将data.json文件中的所有数据请求回页面进行后续操作
    //postData({});
    function postData(data) {
        $.ajax({
            type:'post',
            url:'/',
            data:data,
            dataType:'json',
            success:function (data) {
                // console.log(data);
                pos = data;
                var num = 0;
                pos.forEach(function (item,index) {
                    if ( item.left ) {
                        num++;
                    }
                });
                sum = num;
                $('#finish span').html(sum);
            }
        });
    }


    //设置黑方先走
    $('#changeBlack').on('click',chooseBlack);
    //设置白方先走
    $('#changeWhite').on('click',chooseWhite);

    function chooseBlack() {
        flag = true; //区分黑白棋子
        $(this).css('opacity',0.8);
        $('#changeWhite').css('opacity',0.5);
        em.html('黑子');
    };
    function chooseWhite() {
        flag = false; //区分黑白棋子
        $(this).css('opacity',0.5);
        $('#changeBlack').css('opacity',0.5);
        em.html('白子');
    }

    //生成坐标网格
    for ( var i=0;i<count;i++ ) {
        var row = $('<span>');
        row.addClass('row');
        row.css({'left':0,'top':d*(i+1)});
        row.appendTo(oDiv);

        var column = $('<span>');
        column.addClass('column');
        column.css({'top':0,'left':d*(i+1)});
        column.appendTo(oDiv);
    }


    //点击生成棋子下棋
    //由于要传入事件对象,使用事件绑定的形式,也方便后期解绑事件
    oDiv.on('click',function (e) {
        var e = e||event;
        chess(e);
    })
    //棋盘点击事件函数
    function chess(e) {
        //开始下棋后就不能再改变先后顺序了
        $('#changeBlack').css('opacity',0.5).off('click');
        $('#changeWhite').css('opacity',0.5).off('click');

        //设置一小段时间的点击延迟,原因是如果下棋点击太快后续的胜负判断来不及完成导致胜负判断失效
        setTimeout(function () {
            //获取当前鼠标点击位置的棋子坐标
            function getPos() {
                var clientX = e.clientX - oDiv.offset().left + $(window).scrollLeft();
                var clientY = e.clientY - oDiv.offset().top + $(window).scrollTop();

                //获取鼠标点击的位置坐标
                var x1 = Math.floor(clientX / d);
                var y1 = Math.floor(clientY / d);
                //设置生成的棋子的坐标
                var x2 = x1 * d + 2;
                var y2 = y1 * d + 2;
                return {x:x2,y:y2};
            };

            createPieces();
            //点击创建黑白棋子函数
            function createPieces() {
                var x2 = getPos().x;
                var y2 = getPos().y;
                //判断是否添加棋子坐标
                var b = false;
                //循环判断数组 pos 是否已经存在某个坐标点,如果存在,就不能再添加棋子,不存在的位置才可以添加
                for (var i = 0; i < pos.length; i++) {
                    if (pos[i].left == x2 && pos[i].top == y2) {
                        b = false;
                        break;
                    } else {
                        //注意这里面不能再加 break, 否则达不到效果,当不满足上面的条件就让 b=true 继续循环,直到循环结束或者找到了某个值存在让 b=false就跳出循环
                        b = true;
                    };
                }
                //根据上面的循环依据来设置生成黑白棋子
                if (b) {
                    var i = $('<i>');
                    flag ? i.addClass('black') : i.addClass('white');
                    if ( flag ) {
                        pos.push({status:'black',left:x2,top:y2});
                        postData({status:'black',left:x2,top:y2});
                    }else{
                        pos.push({status:'white',left:x2,top:y2});
                        postData({status:'white',left:x2,top:y2});
                    }
                    flag = !flag;
                    i.css({
                        left: x2,
                        top: y2
                    });
                    i.appendTo(oDiv);
                    sum++;
                    $('#finish span').html(sum);
                    flag==true?em.html('黑子'):em.html('白子');

                };

            };

            /*胜负判断函数,思路是:
             1.每次点击生成一个棋子时就创建4个空数组,
             2.然后根据当前棋子的颜色与坐标给4个空数组添加4个方向的连续的前后9个坐标值,
             3.再循环判断所有的黑子和白字的坐标值是否存在5个连续的棋子在4个不同方向的某一个方向上连成一线了
             4.如果存在5个同颜色的棋子在某一个方向上连成一线了,则根据颜色判断某一方胜出,并锁住棋盘,游戏结束
             */
            //创建棋子坐标数组待检测判断
            function test(color) {
                //获取当前点击位置坐标
                var x3 = getPos().x;
                var y3 = getPos().y;

                //定义四个方向上的空数组
                var arr1 = [];
                var arr2 = [];
                var arr3 = [];
                var arr4 = [];
                //生成水平方向的当前棋子前后共9个位置的连续坐标值
                for ( var i=0;i<9;i++ ) {
                    arr1.push({left:(x3-4*d)+d*i,top:y3});
                };
                //生成垂直方向的当前棋子前后共9个位置的连续坐标值
                for ( var i=0;i<9;i++ ) {
                    arr2.push({left:x3,top:(y3-4*d)+d*i});
                };
                //生成左上至右下方向的当前棋子前后共9个位置的连续坐标值
                for ( var i=0;i<9;i++ ) {
                    arr3.push({left:(x3-4*d)+d*i,top:(y3-4*d)+d*i});
                };
                //生成右上至左下方向的当前棋子前后共9个位置的连续坐标值
                for ( var i=0;i<9;i++ ) {
                    arr4.push({left:(x3+4*d)-d*i,top:(y3-4*d)+d*i});
                };

                //定义4个空白的索引值,用于后续判断胜负
                var index1,index2,index3,index4;
                index1 = index2 = index3 = index4 = 0;
                //调用四个方向上的胜负判断函数,传入空白索引,位置数组和当前棋子颜色
                testWin(index1,arr1,color,x3,y3);
                testWin(index2,arr2,color,x3,y3);
                testWin(index3,arr3,color,x3,y3);
                testWin(index4,arr4,color,x3,y3);

            };
            //根据 flag 的值来判断当前下的棋子是白字还是黑子
            if ( flag==false ) {
                //是黑子
                test('black');
            }else{
                //是白子
                test('white');
            };
            //胜负判断函数,传入计数值,数组与当前棋子的颜色
            function testWin(index,arr,color,x3,y3) {
                //定义空数组用于保存每次符合条件的坐标值
                var result = [];
                //获取相同颜色的棋子
                var sameChess = $('i[class='+color+']');
                //对所有相同颜色的棋子的坐标循环遍历
                for ( var j=0;j<sameChess.length;j++ ) {
                    //再循环位置数组
                    for ( var k=0;k<arr.length;k++ ) {
                        //如果存在棋子的坐标与之前保存的位置数组坐标相同,就将这个棋子的坐标保存在数组result中
                        if ( sameChess.eq(j).position().left==arr[k].left&&sameChess.eq(j).position().top==arr[k].top ) {
                            result.push({left:arr[k].left,top:arr[k].top});
                        }
                    }
                };
                //当满足条件的数组result的长度大于或者等于5时,这里不能仅仅将等于5作为判断条件,因为存在中间为空,两边都下了相同棋子的情况,此时虽然没有连成连续的5个相同的棋子,但是满足数组坐标条件的棋子已经大于5个了,所以此时判断条件为大于等于5
                if ( result.length>=5 ) {
                    //这里需要对满足条件的数组result中的值进行大小排序,因为有可能存在满足判断胜负条件的5个坐标值,但是5个坐标值的不是按顺序排列的,那么在对其进行连续判断的时候就无法做出正确的判断,所以要提前对其进行排序处理
                    //根据result数组中的坐标的left值来判断,当处于垂直排列的满足条件的5个棋子时,则需要根据top值来对其进行排列,因为此时left值都相等,无法根据left值来判断,其他三个方向上的满足条件的坐标值的left值都不同,都可以根据left值的大小来进行排序
                    if ( result[0].left==result[1].left ) {
                        result.sort(function (a,b) {
                            return a.top -b.top;
                        });
                    }else{
                        //其他三个方向上的满足条件的坐标值的left值都不同,都可以根据left值的大小来进行排序
                        result.sort(function (a,b) {
                            return a.left - b.left;
                        });
                    };
                    //发现一个bug:当存在一个空白格子两边都有3个或者4个同色棋子时,就会判断出胜负,而实际上这样还没有达到胜出的条件,正确的判断条件是:1.如果当前棋子位置处于排序后的数组result的首部或者尾部,则当前位置的前后必须为连续的5个坐标; 2.如果当前棋子位置没有处于排序后的数组result的首部或者尾部,也即处于中间位置,则此时必须保证当前棋子的相邻的两个位置有同色棋子,也即保证当前棋子位置与它两个相邻棋子位置的left值的差值和top值的差值小于等于d;
                    //一下为解决方法
                    //获取当前棋子坐标在数组result中的位置索引
                    function getCenterPos(x3,y3) {
                        for ( var i=0;i<result.length;i++ ) {
                            if ( result[i].left==x3&&result[i].top==y3 ) {
                                return i;
                            };
                        };
                    };

                    //获取当前棋子以及与其相邻的两个棋子的left与top值
                    var cenIndex = getCenterPos(x3,y3);
                    var cenPos = result[cenIndex];
                    var propPos = result[cenIndex-1] || cenPos;
                    var nextPos = result[cenIndex+1] || cenPos;
                    var propLeft = cenPos.left - propPos.left;
                    var nextRight = nextPos.left - cenPos.left;
                    var propTop = cenPos.top - propPos.top;
                    var nextTop = nextPos.top - cenPos.top;
                    //当当前棋子位置与它相邻两个棋子位置的left值的差值和top值的差值都小于等于d时才可能进去胜负判断条件;
                    if ( propLeft<=d && nextRight<=d && propTop<=d && nextTop<=d  ) {
                        //这里对已经进行排序处理的result数组遍历,当其存在前后连续的坐标值时,就让索引值加一
                        for ( var m=0;m<result.length-1;m++ ) {
                            if ( (result[m+1].left-result[m].left)<=d && (result[m+1].top-result[m].top)<=d ) {
                                index++;
                            };
                        };
                    };
                };

                //黑方胜出判断
                if ( color=='black' ) {
                    //当存在连续的棋子数大于或者等于4时为胜出,这里的条件判断不能仅仅为等于4,因为存在中间为空,两边都下了相同棋子的情况,此时虽然没有连成连续的5个相同的棋子,但是存在连续的棋子数已经大于5个了,只是中间还存在空格,当中间的空格被补齐时,就已经满足胜负判断的条件了,但此时存在的连续棋子就大于5个,所以此时判断条件为大于等于4,是大于等于4而不是大于等于5的原因是判断连续的棋子当相邻的棋子位置相减满足条件为4时,实际已经有5个棋子了
                    if ( index>=4 ) {
                        //当某一方胜出时结束游戏并解绑棋盘的点击事件
                        oDiv.css('background-color','rgba(100,114,109,1)').off('click');
                        $('#tip').html('黑方胜!').css('display','block');
                        $('#reStart').css('display','block');
                    }
                }else{
                    //白方胜出判断
                    if ( index>=4 ) {
                        //当某一方胜出时结束游戏并解绑棋盘的点击事件
                        oDiv.css('background-color','rgba(100,114,109,1)').off('click');
                        $('#tip').html('白方胜!').css('display','block');
                        $('#reStart').css('display','block');
                    }
                }
            }
        },100);
    };

    //点击重新开始游戏
    $('#reStart').on('click',function () {
        $.ajax({
            type:'get',
            url:'/reStart',
            dataType:'json',
            success:function (data) {
                console.log(data);
                pos = [{left:-1,top:-1}];
            }
        });
        //移除所有的i标签
        $('i').remove();
        //恢复棋盘的初始状态并重新绑定事件函数
        oDiv.css('background-color','rgba(204,204,204,1)').on('click',function (e) {
            var e = e||event;
            chess(e);
        });
        //恢复所有元素的初始状态
        $('#tip').css('display','none');
        $(this).css('display','none');
        $('#changeBlack').css('opacity',1).on('click',chooseBlack);
        $('#changeWhite').css('opacity',1).on('click',chooseWhite);
        em.html('黑子');
        //全部变量都恢复初始状态
        sum = 0;
        $('#finish span').html(sum);
        flag = true;
        //用于保存已经生成的棋子的坐标,作为判断某个位置是否已经有棋子的依据,注意数组里面必须初始添加一组数组,否则就无法做出判断
        // pos = [{left:-1,top:-1}];
        //最后设置return false是为了阻止重新开始按钮的冒泡事件
        return false;
    })

});
